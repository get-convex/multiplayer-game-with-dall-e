import { api } from "./_generated/api";
import { mutationWithSession, queryWithSession } from "./lib/withSession";
import { internalMutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { MaxPromptLength } from "./shared";
import { v } from "convex/values";
import { withMutationRLS, withQueryRLS } from "./rls";

const ImageTimeoutMs = 30000;

export const start = mutationWithSession({
  args: { prompt: v.string() },
  handler: async ({ db, session, scheduler }, { prompt }) => {
    if (prompt.length > MaxPromptLength) throw new Error("Prompt too long");
    const submissionId = await db.insert("submissions", {
      prompt,
      authorId: session.userId,
      result: {
        status: "generating",
        details: "Starting...",
      },
    });
    // Store the current submission in the session to associate with a
    // new user if we log in.
    session.submissionIds.push(submissionId);
    db.patch(session._id, { submissionIds: session.submissionIds });
    scheduler.runAfter(0, api.openai.createImage, {
      prompt,
      submissionId,
    });
    scheduler.runAfter(ImageTimeoutMs, api.submissions.timeout, {
      submissionId,
    });
    return submissionId;
  },
});

export const timeout = internalMutation(
  async ({ db }, { submissionId }: { submissionId: Id<"submissions"> }) => {
    const submission = await db.get(submissionId);
    if (!submission) throw new Error("No submission found");
    if (submission.result.status === "generating") {
      submission.result = {
        status: "failed",
        reason: "Timed out",
        elapsedMs: ImageTimeoutMs,
      };
      db.replace(submissionId, submission);
    }
  }
);

export const get = queryWithSession({
  args: { submissionId: v.id("submissions") },
  handler: withQueryRLS(async ({ db, session, storage }, { submissionId }) => {
    const submission = await db.get(submissionId);
    if (!submission) return null;
    if (submission.result.status === "saved") {
      const { imageStorageId, ...rest } = submission.result;
      const url = await storage.getUrl(imageStorageId);
      if (!url) throw new Error("Image not found");
      return { url, ...rest };
    }
    return submission.result;
  }),
});

export const health = query(async ({ db }) => {
  const latestSubmissions = await db
    .query("submissions")
    .order("desc")
    .filter((q) => q.neq(q.field("result.status"), "generating"))
    .take(5);
  let totalTime = 0;
  let successes = 0;
  for (const submission of latestSubmissions) {
    // Appease typescript
    if (submission.result.status === "generating") continue;
    totalTime += submission.result.elapsedMs;
    if (submission.result.status === "saved") successes += 1;
  }
  const n = latestSubmissions.length;
  return n ? [totalTime / n, successes / n] : [5000, 1.0];
});

export const update = internalMutation(
  withMutationRLS(
    async (
      { db },
      {
        submissionId,
        result,
      }: {
        submissionId: Id<"submissions">;
        result: Doc<"submissions">["result"];
      }
    ) => {
      const submission = await db.get(submissionId);
      if (!submission) throw new Error("Unknown submission");
      submission.result = result;
      await db.replace(submissionId, submission);
    }
  )
);
