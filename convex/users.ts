import { UserIdentity } from "convex/server";
import { getUser } from "./lib/withUser";
import { mutationWithSession, queryWithSession, withSession } from "./sessions";
import md5 from "md5";
import { DatabaseReader, DatabaseWriter, mutation } from "./_generated/server";
import { Document, Id } from "./_generated/dataModel";
import { randomSlug } from "./game";

export const loggedIn = mutationWithSession(async ({ auth, db, session }) => {
  const identity = await auth.getUserIdentity();
  if (!identity) {
    throw new Error("Trying to store a user without authentication present.");
  }
  const userId = await getOrCreateUser(db, identity);
  if (!userId.equals(session.userId)) {
    claimSessionUser(db, session, userId);
  }
});

async function claimSessionUser(
  db: DatabaseWriter,
  session: Document<"sessions">,
  newUserId: Id<"users">
) {
  const userToClaim = (await db.get(session.userId))!;
  if (!userToClaim.tokenIdentifier) {
    // Point the old user to the actual logged-in user.
    await db.patch(userToClaim._id, { claimedByUserId: newUserId });
  }
  // Point the session at the new user going forward.
  await db.patch(session._id, { userId: newUserId });
  if (session.gameId) {
    const game = (await db.get(session.gameId))!;
    if (game.hostId.equals(userToClaim._id)) {
      await db.patch(game._id, { hostId: newUserId });
    }
    const playerIds = game.playerIds.map((playerId) =>
      playerId.equals(userToClaim._id) ? newUserId : playerId
    );
    await db.patch(game._id, { playerIds });
    for (const roundId of game.roundIds) {
      const round = (await db.get(roundId))!;
      if (round.authorId.equals(userToClaim._id)) {
        await db.patch(round._id, { authorId: newUserId });
      }
      const submission = (await db.get(round.submissionId))!;
      if (submission.authorId.equals(userToClaim._id)) {
        await db.patch(submission._id, { authorId: newUserId });
      }
      const options = round.options.map((option) =>
        option.authorId.equals(userToClaim._id)
          ? { ...option, authorId: newUserId }
          : option
      );
      await db.patch(round._id, { options });
    }
  }
}

/**
 * Gets the name from the current session.
 */
export const getName = queryWithSession(async ({ db, session }) => {
  if (!session) return null;
  return (await getUserById(db, session.userId)).name;
});

/**
 * Updates the name in the current session.
 */
export const setName = mutationWithSession(async ({ db, session }, name) => {
  const user = await getUserById(db, session.userId);
  db.patch(user._id, { name });
});

export const getUserById = async (db: DatabaseReader, userId: Id<"users">) => {
  let user = (await db.get(userId))!;
  while (user.claimedByUserId) {
    user = (await db.get(user.claimedByUserId))!;
  }
  return user;
};

export const getOrCreateUser = async (
  db: DatabaseWriter,
  identity: UserIdentity
) => {
  const existing = await getUser(db, identity.tokenIdentifier);
  if (existing) return existing._id;
  return await db.insert("users", {
    name: identity.givenName ?? identity.name!,
    pictureUrl: identity.pictureUrl ?? createGravatarUrl(identity.email!),
    tokenIdentifier: identity.tokenIdentifier,
  });
};

export const createAnonymousUser = (db: DatabaseWriter) => {
  return db.insert("users", {
    // TODO: make this name fun & random
    name: "Anonymous",
    pictureUrl: createGravatarUrl(randomSlug()),
  });
};

export const loggedOut = mutation(
  withSession(async ({ db, session }) => {
    await db.patch(session._id, { userId: await createAnonymousUser(db) });
  })
);

function createGravatarUrl(key: string): string {
  key = key.trim().toLocaleLowerCase();
  const hash = md5(key);
  // See https://en.gravatar.com/site/implement/images/ for details.
  // ?d=monsterid uses a default of a monster image when the hash isn't found.
  return `https://www.gravatar.com/avatar/${hash}?d=monsterid`;
}
