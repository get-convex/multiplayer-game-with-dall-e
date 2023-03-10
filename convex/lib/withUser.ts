import {
  QueryCtx,
  MutationCtx,
  mutation,
  query,
  DatabaseReader,
} from "../_generated/server";
import { Document } from "../_generated/dataModel";
import { Auth } from "convex/server";

/**
 * Wrapper for a Convex query or mutation function that provides a user in ctx.
 *
 * Throws an exception if there isn't a user logged in.
 * Pass this to `query`, `mutation`, or another wrapper. E.g.:
 * export default mutation(withUser(async ({ db, auth, user }, arg1) => {...}));
 * @param func - Your function that can now take in a `user` in the first param.
 * @returns A function to be passed to `query` or `mutation`.
 */
export const withUser = <Ctx extends QueryCtx, Args extends any[], Output>(
  func: (
    ctx: Ctx & { user: Document<"users"> },
    ...args: Args
  ) => Promise<Output>
): ((ctx: Ctx, ...args: Args) => Promise<Output>) => {
  return async (ctx: Ctx, ...args: Args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error(
        "Unauthenticated call to function requiring authentication"
      );
    }
    const user = await getUser(ctx.db, identity.tokenIdentifier);
    if (!user) throw new Error("User not found");
    return func({ ...ctx, user }, ...args);
  };
};

export const getUser = (
  db: DatabaseReader,
  tokenIdentifier: string
): Promise<Document<"users"> | null> => {
  // Note: If you don't want to define an index right away, you can use
  // db.query("users")
  //  .filter(q => q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier))
  //  .unique();
  return db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();
};

/**
 * Wrapper for a Convex mutation function that provides a user in ctx.
 *
 * Throws an exception if there isn't a user logged in.
 * E.g.:
 * export default mutationWithUser(async ({ db, auth, user }, arg1) => {...}));
 * @param func - Your function that can now take in a `user` in the ctx param.
 * @returns A Convex serverless function.
 */
export const mutationWithUser = <Args extends any[], Output>(
  func: (
    ctx: MutationCtx & {
      user: Document<"users">;
    },
    ...args: Args
  ) => Promise<Output>
) => {
  return mutation(withUser(func));
};

/**
 * Wrapper for a Convex query function that provides a user in ctx.
 *
 * Throws an exception if there isn't a user logged in.
 * E.g.:
 * export default queryWithUser(async ({ db, auth, user }, arg1) => {...}));
 * @param func - Your function that can now take in a `user` in the ctx param.
 * @returns A Convex serverless function.
 */
export const queryWithUser = <Args extends any[], Output>(
  func: (
    ctx: QueryCtx & { user: Document<"users"> },
    ...args: Args
  ) => Promise<Output>
) => {
  return query(withUser(func));
};

export default withUser;
