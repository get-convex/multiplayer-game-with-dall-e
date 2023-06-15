import { DataModel, Doc } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";
import { RowLevelSecurity } from "./lib/rowLevelSecurity";

export const { withMutationRLS, withQueryRLS } = RowLevelSecurity<
  QueryCtx & { session?: Doc<"sessions"> },
  DataModel
>({
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
});
