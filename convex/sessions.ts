import { getUser } from "./lib/withUser";
import { createAnonymousUser, getOrCreateUser } from "./users";
import { Document, Id } from "./_generated/dataModel";
import { mutation, MutationCtx, query, QueryCtx } from "./_generated/server";

/**
 * Wrapper for a Convex query or mutation function that provides a session in ctx.
 *
 * Requires the sessionId as the first parameter. This is provided by default by
 * using useSessionQuery or useSessionMutation.
 * Throws an exception if there isn't a valid session.
 * Pass this to `query`, `mutation`, or another wrapper. E.g.:
 * export default mutation(withSession(async ({ db, auth, session }, arg1) => {...}));
 * @param func - Your function that can now take in a `session` in the first param.
 * @returns A function to be passed to `query` or `mutation`.
 */
export const withSession = <Ctx extends QueryCtx, Args extends any[], Output>(
  func: (
    ctx: Ctx & { session: Document<"sessions"> | null },
    ...args: Args
  ) => Promise<Output>,
  required?: boolean
): ((
  ctx: Ctx,
  sessionId: Id<"sessions"> | null,
  ...args: Args
) => Promise<Output>) => {
  return async (ctx: Ctx, sessionId: Id<"sessions"> | null, ...args: Args) => {
    if (sessionId && sessionId.tableName !== "sessions")
      throw new Error("Invalid Session ID");
    const session = sessionId ? await ctx.db.get(sessionId) : null;
    if (required && !session) {
      throw new Error(
        "Session must be initialized first. " +
          "Are you wrapping your code with <SessionProvider>? " +
          "Are you requiring a session from a query that executes immediately?"
      );
    }
    return func({ ...ctx, session }, ...args);
  };
};

/**
 * Wrapper for a Convex mutation function that provides a session in ctx.
 *
 * Requires the sessionId as the first parameter. This is provided by default by
 * using useSessionMutation.
 * Throws an exception if there isn't a valid session.
 * E.g.:
 * export default mutationWithSession(async ({ db, auth, session }, arg1) => {...}));
 * @param func - Your function that can now take in a `session` in the ctx param.
 * @returns A Convex serverless function.
 */
export const mutationWithSession = <Args extends any[], Output>(
  func: (
    ctx: MutationCtx & { session: Document<"sessions"> },
    ...args: Args
  ) => Promise<Output>
) => {
  return mutation(
    withSession((ctx, ...args: Args) => {
      const { session } = ctx;
      if (!session) {
        throw new Error("Session not initialized yet");
      }
      return func({ ...ctx, session }, ...args);
    })
  );
};

/**
 * Wrapper for a Convex query function that provides a session in ctx.
 *
 * Requires the sessionId as the first parameter. This is provided by default by
 * using useSessionQuery.
 * Throws an exception if there isn't a session logged in.
 * You can't return null, because we use that sentinel value as a sign that
 * the session hasn't been initialized yet.
 * E.g.:
 * export default queryWithSession(async ({ db, auth, session }, arg1) => {...}));
 * @param func - Your function that can now take in a `session` in the ctx param.
 * @returns A Convex serverless function.
 */
export const queryWithSession = <
  Args extends any[],
  Output extends NonNullable<any>
>(
  func: (
    ctx: QueryCtx & { session: Document<"sessions"> },
    ...args: Args
  ) => Promise<Output | null>
) => {
  return query(
    withSession((ctx, ...args: Args) => {
      const { session } = ctx;
      if (!session) {
        // If the session hasn't been initialized yet, let's act like the query
        // hasn't finished yet. On the client, it will be translated to
        // `undefined`.
        return Promise.resolve(null);
      }
      return func({ ...ctx, session }, ...args);
    })
  );
};

/**
 * Creates a session and returns the id. For use with the SessionProvider on the
 * client.
 */
export const create = mutation(async ({ db, auth }) => {
  const identity = await auth.getUserIdentity();
  let userId = identity && (await getOrCreateUser(db, identity));
  if (!userId) {
    userId = await createAnonymousUser(db);
  }
  return db.insert("sessions", {
    userId,
  });
});

/**
 * Gets the current session.
 * TODO: update based on your usecase.
 */
export const get = queryWithSession(async ({ session }) => {
  // Depending on what sensitive data you store in here, you might
  // want to limit what you return to clients.
  return session;
});
