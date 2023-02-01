import { WithoutSystemFields } from "convex/server";
import { optional, z } from "zod";
import withZodArgs, { withZodObjectArg } from "./lib/withZod";
import { zId } from "./lib/zodUtils";
import { withSession } from "./sessions";
import { Document, Id } from "./_generated/dataModel";
import { DatabaseReader, mutation, query } from "./_generated/server";

export const MaxOptions = 8;
const LabelDurationMs = 30000;
const GuessDurationMs = 30000;
const RevealDurationMs = 30000;

export const newRound = (
  authorId: Id<"users">,
  submissionId: Id<"submissions">,
  maxOptions: number
): WithoutSystemFields<Document<"rounds">> => ({
  authorId,
  submissionId,
  stage: "label",
  stageStart: Date.now(),
  stageEnd: Date.now() + LabelDurationMs,
  maxOptions,
  options: [],
});
export const getRound = query(
  withZodArgs(
    [zId("rounds")],
    async ({ db, storage }, roundId) => {
      const round = await db.get(roundId);
      if (!round) throw new Error("Round not found");
      const { stage, stageEnd } = round;
      const submission = await db.get(round.submissionId);
      if (!submission) throw new Error("Round's submission is missing");
      const imageUrl = await storage.getUrl(submission.imageStorageId);
      switch (stage) {
        case "label":
          return { stage, imageUrl, stageEnd };
        case "guess":
          return {
            options: round.options.map((option) => option.prompt),
            stage,
            imageUrl,
            stageEnd,
          };
        case "reveal":
          // TODO
          return {
            results: [],
            stage,
            imageUrl,
            stageEnd,
          };
      }
    },
    z.union([
      z.object({
        stage: z.literal("label"),
        imageUrl: z.string(),
        stageEnd: z.number(),
      }),
      z.object({
        stage: z.literal("guess"),
        imageUrl: z.string(),
        stageEnd: z.number(),
        options: z.array(z.string()),
      }),
      z.object({
        stage: z.literal("reveal"),
        imageUrl: z.string(),
        stageEnd: z.number(),
        results: z.array(
          z.object({
            author: zId("users"),
            prompt: z.string(),
            votes: z.array(zId("users")),
            likes: z.array(zId("users")),
            scoreDeltas: z.map(zId("users"), z.number()),
          })
        ),
      }),
    ])
  )
);

export const addPrompt = mutation(
  withSession(
    withZodObjectArg(
      { roundId: zId("rounds"), prompt: z.string() },
      async ({ db, session }, { roundId, prompt }) => {
        const round = await db.get(roundId);
        if (!round) throw new Error("Round not found");
        if (round.stage !== "label") {
          return { success: false, reason: "Too late to add a prompt." };
        }
        if (
          round.options.findIndex((option) =>
            option.author.equals(session.userId)
          ) !== -1
        ) {
          return { success: false, reason: "You already added a prompt." };
        }
        if (round.options.length === round.maxOptions) {
          return { success: false, reason: "This round is full." };
        }
        if (
          round.options.findIndex(
            (option) =>
              // TODO: do fuzzy matching
              option.prompt === prompt
          ) !== -1
        ) {
          return {
            success: false,
            retry: true,
            reason: "This prompt is too similar to existing prompt(s).",
          };
        }

        round.options.push({
          author: session.userId,
          prompt,
          votes: [],
          likes: [],
        });
        const patch: Partial<typeof round> =
          round.options.length === round.maxOptions
            ? beingGuessPatch(round)
            : {};
        patch.options = round.options;
        await db.patch(round._id, patch);
        return { success: true };
      }
    )
  )
);

// Modifies parameter to progress to guessing
const beingGuessPatch = (
  round: Document<"rounds">
): Partial<Document<"rounds">> => ({
  stage: "guess",
  maxOptions: round.options.length,
  stageStart: Date.now(),
  stageEnd: Date.now() + GuessDurationMs,
});

export const vote = mutation(
  withSession(
    withZodObjectArg(
      { roundId: zId("rounds"), prompt: z.string() },
      async ({ db, session }, { roundId, prompt }) => {
        const round = await db.get(roundId);
        if (!round) throw new Error("Round not found");
        if (round.stage !== "label") {
          return { success: false, reason: "Too late to vote." };
        }
        const optionVotedFor = round.options.find(
          (option) =>
            // TODO: do fuzzy matching
            option.prompt === prompt
        );
        if (!optionVotedFor) {
          return {
            success: false,
            retry: true,
            reason: "This prompt does not exist.",
          };
        }
        const existingVote = round.options.find(
          (option) =>
            option.votes.findIndex((vote) => vote.equals(session.userId)) !== -1
        );
        if (prompt === existingVote?.prompt) {
          return {
            success: false,
            retry: true,
            reason: "You already voted for this option.",
          };
        }
        if (existingVote) {
          // Remove existing vote
          const voteIndex = existingVote.votes.findIndex((vote) =>
            vote.equals(session.userId)
          );
          round.options = round.options
            .slice(0, voteIndex)
            .concat(...round.options.slice(voteIndex + 1));
        }
        optionVotedFor.votes.push(session.userId);

        const totalVotes = round.options
          .map((option) => option.votes.length)
          .reduce((total, votes) => total + votes, 0);
        const patch: Partial<typeof round> =
          totalVotes === round.maxOptions ? beingRevealPatch(round) : {};
        patch.options = round.options;
        await db.patch(round._id, patch);
        return { success: true, retry: true };
      }
    )
  )
);

// Modifies parameter to progress to guessing
const beingRevealPatch = (
  round: Document<"rounds">
): Partial<Document<"rounds">> => ({
  stage: "reveal",
  maxOptions: round.options.length,
  stageStart: Date.now(),
  stageEnd: Date.now() + RevealDurationMs,
});
