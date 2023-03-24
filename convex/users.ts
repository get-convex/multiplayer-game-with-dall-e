import { UserIdentity } from "convex/server";
import { getUser } from "./lib/withUser";
import { mutationWithSession, queryWithSession } from "./lib/withSession";
import md5 from "md5";
import { DatabaseReader, DatabaseWriter, mutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { randomSlug } from "./game";
import withZodObjectArg from "./lib/withZod";
import { z } from "zod";
import { zId } from "./lib/zodUtils";

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
    if (submission && submission.authorId.equals(userToClaim._id)) {
      await db.patch(submission?._id, { authorId: newUserId });
    }
  }
  for (const gameId of session.gameIds) {
    const game = (await db.get(gameId))!;
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
export const getMyProfile = queryWithSession(async ({ db, session }) => {
  if (!session) return null;
  const { name, pictureUrl } = await getUserById(db, session.userId);
  return { name, pictureUrl };
});

/**
 * Updates the name in the current session.
 */
export const setName = mutationWithSession(
  withZodObjectArg(
    { name: z.string().length(100) },
    async ({ db, session }, { name }) => {
      const user = await getUserById(db, session.userId);
      db.patch(user._id, { name });
    }
  )
);

export const setPicture = mutationWithSession(
  withZodObjectArg(
    { submissionId: zId("submissions") },
    async ({ db, session, storage }, { submissionId }) => {
      const submission = await db.get(submissionId);
      if (!submission) throw new Error("No submission found");
      if (!submission.authorId.equals(session.userId))
        throw new Error("Not yours");
      if (submission.result.status !== "saved")
        throw new Error("Bad submission");
      const pictureUrl = await storage.getUrl(submission.result.imageStorageId);
      if (!pictureUrl) throw new Error("Picture is missing");
      db.patch(session.userId, { pictureUrl });
    }
  )
);

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
    name: "",
    pictureUrl: createGravatarUrl(randomSlug()),
  });
};

export const loggedOut = mutationWithSession(async ({ db, session }) => {
  // Wipe the slate clean
  await db.replace(session._id, {
    userId: await createAnonymousUser(db),
    gameIds: [],
    submissionIds: [],
  });
});

function createGravatarUrl(key: string): string {
  key = key.trim().toLocaleLowerCase();
  const hash = md5(key);
  // See https://en.gravatar.com/site/implement/images/ for details.
  // ?d=monsterid uses a default of a monster image when the hash isn't found.
  return `https://www.gravatar.com/avatar/${hash}?d=monsterid`;
}
