import { DataModel, Doc } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";
import { RowLevelSecurity } from "./lib/rowLevelSecurity";

export const { withMutationRLS, withQueryRLS } = RowLevelSecurity<
  QueryCtx & { session?: Doc<"sessions"> },
  DataModel
>({
  users: {
    modify: async ({ session }, user) =>
      user._id.equals(session?.userId) ||
      !!user.claimedByUserId?.equals(session?.userId),
  },
  sessions: {
    read: async ({ session }, doc) => doc._id.equals(session?._id),
    modify: async ({ session }, doc) => doc._id.equals(session?._id),
  },
  submissions: {
    modify: async ({ session }, submission) =>
      submission.authorId.equals(session?.userId),
  },
});
