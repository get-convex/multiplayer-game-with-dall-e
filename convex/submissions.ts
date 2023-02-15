import { z } from "zod";
import withZodArgs, { withZodObjectArg } from "./lib/withZod";
import { zId } from "./lib/zodUtils";
import { newRound } from "./round";
import { withSession } from "./lib/withSession";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { MaxPromptLength } from "./shared";

const ImageTimeoutMs = 30000;

export const start = mutation(
  withSession(
    withZodArgs(
      [z.string().max(MaxPromptLength)],
      async ({ db, session, scheduler }, prompt) => {
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
        scheduler.runAfter(0, "actions/createImage", prompt, submissionId);
        scheduler.runAfter(ImageTimeoutMs, "submissions:timeout", submissionId);
        return submissionId;
      },
      zId("submissions")
    )
  )
);

export const timeout = mutation(
  async ({ db }, submissionId: Id<"submissions">) => {
    const submission = await db.get(submissionId);
    if (!submission) throw new Error("No submission found");
    if (submission.result.status === "generating") {
      db.patch(submissionId, {
        result: {
          status: "failed",
          reason: "Timed out",
          elapsedMs: ImageTimeoutMs,
        },
      });
    }
  }
);

export const get = query(
  withSession(
    withZodArgs(
      [zId("submissions")],
      async ({ db, session, storage }, submissionId) => {
        const submission = await db.get(submissionId);
        if (!submission) return null;
        if (!session.userId.equals(submission.authorId)) {
          throw new Error("This isn't your submission");
        }
        if (submission.result.status === "saved") {
          const { imageStorageId, ...rest } = submission.result;
          const url = await storage.getUrl(imageStorageId);
          if (!url) throw new Error("Image not found");
          return { url, ...rest };
        }
        return submission.result;
      },
      z.union([
        z.null(),
        z.object({
          status: z.literal("generating"),
          details: z.string(),
        }),
        z.object({
          status: z.literal("failed"),
          reason: z.string(),
          elapsedMs: z.number(),
        }),
        z.object({
          status: z.literal("saved"),
          url: z.string(),
          elapsedMs: z.number(),
        }),
      ])
    )
  )
);

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

// TODO: limit to only accessible from the dall-e action
export const update = mutation(async ({ db }, submissionId, result) => {
  await db.patch(submissionId, { result });
});

export const addToGame = mutation(
  withSession(
    withZodObjectArg(
      { submissionId: zId("submissions"), gameId: zId("games") },
      async ({ db, session }, { submissionId, gameId }) => {
        const game = await db.get(gameId);
        if (!game) throw new Error("Game not found");
        const submission = await db.get(submissionId);
        if (submission?.result.status !== "saved") {
          throw new Error(
            `Can't add ${submission?.result.status} submissions: `
          );
        }
        if (!submission.authorId.equals(session.userId)) {
          throw new Error("This is not your submission.");
        }
        const { authorId, prompt, result } = submission;
        for (const roundId of game.roundIds) {
          const round = (await db.get(roundId))!;
          if (round.authorId.equals(authorId)) {
            throw new Error("You already submitted.");
          }
        }
        const roundIds = game.roundIds;
        roundIds.push(
          await db.insert(
            "rounds",
            newRound(
              authorId,
              result.imageStorageId,
              prompt,
              game.playerIds.length
            )
          )
        );
        await db.patch(game._id, { roundIds });
        // Start the game, everyone's submitted.
        if (roundIds.length === game.playerIds.length) {
          await db.patch(game._id, {
            state: { stage: "rounds", roundId: game.roundIds[0] },
          });
        }
      }
    )
  )
);

// Generate a short-lived upload URL.
export const generateUploadUrl = mutation(async ({ storage }) => {
  return await storage.generateUploadUrl();
});
