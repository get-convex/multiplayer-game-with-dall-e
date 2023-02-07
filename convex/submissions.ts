import { z } from "zod";
import withZodArgs, { withZodObjectArg } from "./lib/withZod";
import { zId } from "./lib/zodUtils";
import { newRound } from "./round";
import { withSession } from "./lib/withSession";
import { Document, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

export const start = mutation(
  withSession(
    withZodObjectArg(
      { gameId: zId("games"), prompt: z.string() },
      async ({ db, session, scheduler }, { gameId, prompt }) => {
        const game = await db.get(gameId);
        if (!game) throw new Error("Game not found");
        for (const roundId of game.roundIds) {
          const round = (await db.get(roundId))!;
          if (round.authorId.equals(session.userId)) {
            throw new Error("You already submitted.");
          }
        }
        const submissionId = await db.insert("submissions", {
          prompt,
          authorId: session.userId,
          status: "generating",
        });
        // Store the current submission in the session to associate with a
        // new user if we log in.
        session.submissionIds.push(submissionId);
        db.patch(session._id, { submissionIds: session.submissionIds });
        scheduler.runAfter(0, "actions/createImage", prompt, submissionId);
        return submissionId;
      }
    )
  )
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
        if (submission.status === "saved") {
          const { imageStorageId, ...rest } = submission;
          const url = await storage.getUrl(imageStorageId);
          return { ...rest, url };
        }
        return submission;
      }
    )
  )
);

// TODO: limit to only accessible from the dall-e action
export const update = mutation(
  async (
    { db },
    submissionId: Id<"submissions">,
    patch: Partial<Document<"submissions">>
  ) => {
    await db.patch(submissionId, patch);
  }
);

export const addToGame = mutation(
  withSession(
    withZodObjectArg(
      { submissionId: zId("submissions"), gameId: zId("games") },
      async ({ db, session }, { submissionId, gameId }) => {
        const game = await db.get(gameId);
        if (!game) throw new Error("Game not found");
        const submission = await db.get(submissionId);
        if (submission?.status !== "saved") {
          throw new Error(`Can't add ${submission?.status} submissions: `);
        }
        if (!submission.authorId.equals(session.userId)) {
          throw new Error("This is not your submission.");
        }
        const { authorId, prompt, imageStorageId } = submission;
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
            newRound(authorId, imageStorageId, prompt, game.playerIds.length)
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
