/**
 * Functions related to reading & writing presence data.
 *
 * Note: this file does not currently implement authorization.
 * That is left as an exercise to the reader. Some suggestions for a production
 * app:
 * - Use Convex `auth` to authenticate users rather than passing up a "user"
 * - Check that the user is allowed to be in a given game.
 */
import { queryWithSession, withSession } from "./lib/withSession";
import { query, mutation } from "./_generated/server";

const LIST_LIMIT = 20;

/**
 * Overwrites the presence data for a given user in a game.
 *
 * It will also set the "updated" timestamp to now, and create the presence
 * document if it doesn't exist yet.
 *
 * @param game - The location associated with the presence data. Examples:
 * page, chat channel, game instance.
 * @param user - The user associated with the presence data.
 */
export const update = mutation(
  withSession(
    async ({ db, session }, game: string, data: any) => {
      if (!session) {
        console.error("Session not initalized in presence:update");
        return;
      }
      const existing = await db
        .query("presence")
        .withIndex("by_session_game", (q) =>
          q.eq("sessionId", session._id).eq("game", game)
        )
        .unique();
      if (existing) {
        await db.patch(existing._id, { data, updated: Date.now() });
      } else {
        await db.insert("presence", {
          sessionId: session._id,
          data,
          game,
          updated: Date.now(),
        });
      }
    },
    { optional: true }
  )
);

/**
 * Updates the "updated" timestamp for a given user's presence in a game.
 *
 * @param game - The location associated with the presence data. Examples:
 * page, chat channel, game instance.
 * @param user - The user associated with the presence data.
 */
export const heartbeat = mutation(
  withSession(
    async ({ db, session }, game: string) => {
      if (!session) {
        console.warn("Session not initalized in presence:heartbeat");
        return;
      }
      const existing = await db
        .query("presence")
        .withIndex("by_session_game", (q) =>
          q.eq("sessionId", session._id).eq("game", game)
        )
        .unique();
      if (existing) {
        await db.patch(existing._id, { updated: Date.now() });
      }
    },
    { optional: true }
  )
);

/**
 * Lists the presence data for N users in a game, ordered by recent update.
 *
 * @param game - The location associated with the presence data. Examples:
 * page, chat channel, game instance.
 * @returns A list of presence objects, ordered by recent update, limited to
 * the most recent N.
 */
export const list = query(async ({ db }, game: string) => {
  const presence = await db
    .query("presence")
    .withIndex("by_game_updated", (q) => q.eq("game", game))
    .order("desc")
    .take(LIST_LIMIT);
  return Promise.all(
    presence.map(async ({ _creationTime, updated, sessionId, data }) => ({
      created: _creationTime,
      updated,
      userId: (await db.get(sessionId))!.userId,
      data,
    }))
  );
});

export const myUserId = queryWithSession(
  async ({ session }) => session?.userId
);
