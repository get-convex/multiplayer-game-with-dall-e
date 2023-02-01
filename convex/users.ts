import { UserIdentity } from "convex/server";
import { getUser } from "./lib/withUser";
import { withSession } from "./sessions";
import md5 from "md5";
import { DatabaseReader, DatabaseWriter, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { randomSlug } from "./game";

export const loggedIn = mutation(
  withSession(async ({ auth, db, session }) => {
    const identity = await auth.getUserIdentity();
    if (!identity) {
      throw new Error("Trying to store a user without authentication present.");
    }
    if (!session) throw new Error("Session not initialized");
    const userId = await getOrCreateUser(db, identity);
    if (!userId.equals(session.userId)) {
      const sessionUser = (await db.get(session.userId))!;
      if (!sessionUser.tokenIdentifier)
        // Point the old user to the actual logged-in user.
        await db.patch(sessionUser._id, { claimedByUserId: userId });
      // Point the session at the new user going forward.
      await db.patch(session._id, { userId: userId });
    }
  })
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
    name: "Anonymous",
    pictureUrl: createGravatarUrl(randomSlug()),
  });
};

export const loggedOut = mutation(
  withSession(async ({ db, session }) => {
    if (!session) throw new Error("Session not initialized");
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
