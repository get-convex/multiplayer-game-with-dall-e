import { UserIdentity } from "convex/server";
import { myMutation, sessionMutation, sessionQuery } from "./lib/myFunctions";
import md5 from "md5";
import { DatabaseReader, DatabaseWriter } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { randomSlug } from "./lib/randomSlug";
import { v } from "convex/values";

export const loggedIn = sessionMutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Trying to store a user without authentication present.");
    }
    const userId = await getOrCreateUser(ctx.db, identity);
    if (userId !== ctx.session.userId) {
      claimSessionUser(ctx.db, ctx.session, userId);
    }
  },
});

async function claimSessionUser(
  db: DatabaseWriter,
  session: Doc<"sessions">,
  newUserId: Id<"users">
) {
  const userToClaim = (await db.get(session.userId))!;
  if (!userToClaim.tokenIdentifier) {
    // Point the old user to the actual logged-in user.
    await db.patch(userToClaim._id, { claimedByUserId: newUserId });
  }
  // Point the session at the new user going forward.
  await db.patch(session._id, { userId: newUserId });
  for (const submissionId of session.submissionIds) {
    const submission = await db.get(submissionId);
    if (submission && submission.authorId === userToClaim._id) {
      await db.patch(submission?._id, { authorId: newUserId });
    }
  }
  for (const gameId of session.gameIds) {
    const game = (await db.get(gameId))!;
    if (game.hostId === userToClaim._id) {
      await db.patch(game._id, { hostId: newUserId });
    }
    const playerIds = game.playerIds.map((playerId) =>
      playerId === userToClaim._id ? newUserId : playerId
    );
    await db.patch(game._id, { playerIds });
    for (const roundId of game.roundIds) {
      const round = (await db.get(roundId))!;
      if (round.authorId === userToClaim._id) {
        await db.patch(round._id, { authorId: newUserId });
      }
      const options = round.options.map((option) =>
        option.authorId === userToClaim._id
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
export const getMyProfile = sessionQuery({
  args: {},
  handler: async (ctx) => {
    if (!ctx.session) return null;
    const { name, pictureUrl } = await getUserById(ctx.db, ctx.session.userId);
    return { name, pictureUrl };
  },
});

/**
 * Updates the name in the current session.
 */
export const setName = sessionMutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const user = await getUserById(ctx.db, ctx.session.userId);
    if (name.length > 100) throw new Error("Name too long");
    await ctx.db.patch(user._id, { name });
  },
});

export const setPicture = sessionMutation({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, { submissionId }) => {
    const submission = await ctx.db.get(submissionId);
    if (!submission) throw new Error("No submission found");
    if (submission.result.status !== "saved") throw new Error("Bad submission");
    const pictureUrl = await ctx.storage.getUrl(
      submission.result.imageStorageId
    );
    if (!pictureUrl) throw new Error("Picture is missing");
    await ctx.db.patch(ctx.session.userId, { pictureUrl });
  },
});

export const getUserById = async (db: DatabaseReader, userId: Id<"users">) => {
  let user = (await db.get(userId))!;
  while (user.claimedByUserId) {
    user = (await db.get(user.claimedByUserId))!;
  }
  return user;
};

async function getUser(db: DatabaseReader, tokenIdentifier: string) {
  return await db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();
}

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
    name: "",
    pictureUrl: createGravatarUrl(randomSlug()),
  });
};

export const loggedOut = sessionMutation({
  args: {},
  handler: async (ctx) => {
    // Wipe the slate clean
    await ctx.db.replace(ctx.session._id, {
      userId: await createAnonymousUser(ctx.db),
      gameIds: [],
      submissionIds: [],
    });
  },
});

function createGravatarUrl(key: string): string {
  key = key.trim().toLocaleLowerCase();
  const hash = md5(key);
  // See https://en.gravatar.com/site/implement/images/ for details.
  // ?d=monsterid uses a default of a monster image when the hash isn't found.
  return `https://www.gravatar.com/avatar/${hash}?d=monsterid`;
}

/**
 * Creates a session and returns the id. For use with the SessionProvider on the
 * client.
 */
export const createSession = myMutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    let userId = identity && (await getOrCreateUser(ctx.db, identity));
    if (!userId) {
      userId = await createAnonymousUser(ctx.db);
    }
    return ctx.db.insert("sessions", {
      userId,
      gameIds: [],
      submissionIds: [],
    });
  },
});
