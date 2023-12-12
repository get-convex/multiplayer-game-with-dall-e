import {
  NoOp,
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import {
  Rules,
  wrapDatabaseReader,
  wrapDatabaseWriter,
} from "convex-helpers/server/rowLevelSecurity";
import { internalMutation, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { DataModel, Doc } from "../_generated/dataModel";

const rules: Rules<{ session: Doc<"sessions"> | null }, DataModel> = {
  users: {
    modify: async ({ session }, user) =>
      user._id === session?.userId ||
      !!(user.claimedByUserId === session?.userId),
  },
  sessions: {
    read: async ({ session }, doc) => doc._id === session?._id,
    modify: async ({ session }, doc) => doc._id === session?._id,
  },
  submissions: {
    modify: async ({ session }, submission) =>
      submission.authorId === session?.userId,
  },
};

// Placeholders in case we want to apply RLS to this or something
export const myInternalMutation = customMutation(internalMutation, NoOp);
export const myMutation = customMutation(
  mutation,
  customCtx((ctx) => ({
    db: wrapDatabaseWriter({ session: null }, ctx.db, rules),
  }))
);

export const myQuery = customQuery(
  query,
  customCtx((ctx) => ({
    db: wrapDatabaseReader({ session: null }, ctx.db, rules),
  }))
);

export const sessionMutation = customMutation(mutation, {
  args: {
    sessionId: v.id("sessions"),
  },
  input: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error(`Session not found: ${args.sessionId}`);
    return {
      ctx: { session, db: wrapDatabaseWriter({ session }, ctx.db, rules) },
      args: {},
    };
  },
});

export const internalSessionMutation = customMutation(internalMutation, {
  args: {
    sessionId: v.id("sessions"),
  },
  input: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error(`Session not found: ${args.sessionId}`);
    return {
      ctx: { session, db: wrapDatabaseWriter({ session }, ctx.db, rules) },
      args: {},
    };
  },
});

export const sessionQuery = customQuery(query, {
  args: {
    sessionId: v.id("sessions"),
  },
  input: async (ctx, args) => {
    const session = (await ctx.db.get(args.sessionId)) ?? null;
    return {
      ctx: { session, db: wrapDatabaseReader({ session }, ctx.db, rules) },
      args: {},
    };
  },
});
