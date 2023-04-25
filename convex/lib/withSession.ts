import {
  ObjectType,
  PropertyValidators,
  ValidatedFunction,
} from "convex/server";
import { Doc, Id } from "../_generated/dataModel";
import { mutation, MutationCtx, query, QueryCtx } from "../_generated/server";
import { v } from "convex/values";

// /**
//  * Wrapper for a Convex query or mutation function that provides a session in ctx.
//  *
//  * Requires an `Id<"sessions">` as the first parameter. This is provided by
//  * default by using {@link useSessionQuery} or {@link useSessionMutation}.
//  * Pass this to `query`, `mutation`, or another wrapper. E.g.:
//  * ```ts
//  * export default mutation(withSession(async ({ db, auth, session }, { arg1 }) => {...}));
//  * ```
//  * Throws an exception if there isn't a valid session.
//  * @param func - Your function that can now take in a `session` in the first param.
//  * @returns A function to be passed to `query` or `mutation`.
//  */
// export function withSession<
//   Ctx extends QueryCtx,
//   Args extends Record<string, any>,
//   Output
// >(
//   func: (ctx: Ctx & { session: Doc<"sessions"> }, args: Args) => Promise<Output>
// ): (
//   ctx: Ctx,
//   args: Args & { sessionId: Id<"sessions"> | null }
// ) => Promise<Output>;
// /**
//  * Wrapper for a Convex query or mutation function that provides a session in ctx.
//  *
//  * Requires an `Id<"sessions">` as the first parameter. This is provided by
//  * default by using {@link useSessionQuery} or {@link useSessionMutation}.
//  * Pass this to `query`, `mutation`, or another wrapper. E.g.:
//  * ```ts
//  * export default mutation(withSession(async ({ db, auth, session }, arg1) => {...}));
//  * ```
//  * @param func - Your function that can now take in a `session` in the first param.
//  * @returns A function to be passed to `query` or `mutation`.
//  */
// export function withSession<
//   Ctx extends QueryCtx,
//   Args extends Record<string, any>,
//   Output
// >(
//   func: (
//     ctx: Ctx & { session: Doc<"sessions"> | null },
//     args: Args
//   ) => Promise<Output>,
//   options: { optional: true }
// ): (
//   ctx: Ctx,
//   args: Args & { sessionId: Id<"sessions"> | null }
// ) => Promise<Output>;
/**
 * Wrapper for a Convex query or mutation function that provides a session in ctx.
 *
 * Requires an `Id<"sessions">` as the first parameter. This is provided by
 * default by using {@link useSessionQuery} or {@link useSessionMutation}.
 * Pass this to `query`, `mutation`, or another wrapper. E.g.:
 * ```ts
 * export default mutation(withSession(async ({ db, auth, session }, { arg1 }) => {...}));
 * ```
 * Throws an exception if there isn't a valid session unless `{optional: true}`.
 * @param func - Your function that can now take in a `session` in the first param.
 * @returns A function to be passed to `query` or `mutation`.
 */
// <Output, ArgsValidator extends PropertyValidators>(func: ValidatedFunction<MutationCtx<DataModel, API>, ArgsValidator, Output>): RegisteredMutation<Visibility, [ObjectType<ArgsValidator>], Output>;

const sessionIdValidator = v.union(v.id("sessions"), v.null());
export function withSession<
  Ctx extends QueryCtx,
  ArgsValidator extends PropertyValidators,
  Output
>({
  args,
  handler,
}: ValidatedFunction<
  Ctx & { session: Doc<"sessions"> | null },
  ArgsValidator,
  Output
>): ValidatedFunction<
  Ctx,
  ArgsValidator & { sessionId: typeof sessionIdValidator },
  Output
> {
  return {
    args: { ...args, sessionId: sessionIdValidator },
    handler: async (
      ctx: Ctx,
      allArgs: ObjectType<
        ArgsValidator & { sessionId: typeof sessionIdValidator }
      >
    ) => {
      const { sessionId, ...args } = allArgs;
      if (sessionId && sessionId.tableName !== "sessions")
        throw new Error(
          "Invalid Session ID. Use useSessionMutation or useSessionQuery."
        );
      const session = sessionId ? await ctx.db.get(sessionId) : null;
      // todo: make optional
      if (!session) {
        throw new Error(
          "Session must be initialized first. " +
            "Are you wrapping your code with <SessionProvider>? " +
            "Are you requiring a session from a query that executes immediately?"
        );
      }
      return handler({ ...ctx, session }, allArgs);
    },
  };
}

/**
 * Wrapper for a Convex mutation function that provides a session in ctx.
 *
 * Requires an `Id<"sessions">` as the first parameter. This is provided by
 * default by using {@link useSessionMutation}.
 * E.g.:
 * ```ts
 * export default mutationWithSession(async ({ db, auth, session }, { arg1 }) => {...}));
 * ```
 * @param func - Your function that can now take in a `session` in the ctx param.
 * @returns A Convex serverless function.
 */
export const mutationWithSession = <Args extends Record<string, any>, Output>(
  func: (
    ctx: MutationCtx & { session: Doc<"sessions"> },
    args: Args
  ) => Promise<Output>
) => {
  return mutation(withSession(func));
};

/**
 * Wrapper for a Convex query function that provides a session in ctx.
 *
 * Requires an `Id<"sessions">` as the first parameter. This is provided by
 * default by using {@link useSessionQuery}.
 * E.g.:
 * ```ts
 * export default queryWithSession(async ({ db, auth, session }, { arg1 }) => {...}));
 * ```
 * If the session isn't initialized yet, it will pass null.
 * @param func - Your function that can now take in a `session` in the ctx param.
 * @returns A Convex serverless function.
 */
export const queryWithSession = <
  Args extends Record<string, any>,
  Output extends NonNullable<any>
>(
  func: (
    ctx: QueryCtx & { session: Doc<"sessions"> | null },
    args: Args
  ) => Promise<Output | null>
) => {
  return query(withSession(func, { optional: true }));
};
