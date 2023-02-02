import { WithoutSystemFields } from "convex/server";
import { optional, z } from "zod";
import withZodArgs, { withZodObjectArg } from "./lib/withZod";
import { zId } from "./lib/zodUtils";
import { queryWithSession, withSession } from "./sessions";
import { Document, Id } from "./_generated/dataModel";
import { mutation } from "./_generated/server";

export const MaxOptions = 8;
const LabelDurationMs = 30000;
const GuessDurationMs = 30000;
const RevealDurationMs = 30000;

export const newRound = (
  authorId: Id<"users">,
  imageStorageId: string,
  prompt: string,
  maxOptions: number
): WithoutSystemFields<Document<"rounds">> => ({
  authorId,
  imageStorageId,
  stage: "label",
  stageStart: Date.now(),
  stageEnd: Date.now() + LabelDurationMs,
  maxOptions,
  options: [{ prompt, authorId, votes: [], likes: [] }],
});

export const getRound = queryWithSession(
  withZodArgs(
    [zId("rounds")],
    async ({ db, session, storage }, roundId) => {
      const round = await db.get(roundId);
      if (!round) throw new Error("Round not found");
      const { stage, stageEnd } = round;
      const imageUrl = await storage.getUrl(round.imageStorageId);

      const userInfo = async (userId: Id<"users">) => {
        const user = (await db.get(userId))!;
        return {
          me: user._id.equals(session?.userId),
          name: user.name,
          pictureUrl: user.pictureUrl,
        };
      };

      switch (stage) {
        case "label":
          return {
            stage,
            imageUrl,
            stageEnd,
            submitted: await Promise.all(
              round.options.map((option) => userInfo(option.authorId))
            ),
          };
        case "guess":
          const allGuesses = round.options.reduce(
            (all, { votes }) => all.concat(votes),
            [] as Id<"users">[]
          );
          return {
            options: round.options.map((option) => option.prompt),
            stage,
            imageUrl,
            stageEnd,
            submitted: await Promise.all(allGuesses.map(userInfo)),
          };
        case "reveal":
          // TODO
          return {
            results: await Promise.all(
              round.options.map(async (option) => ({
                ...option,
                ...(await userInfo(option.authorId)),
                scoreDeltas: calculateScoreDeltas(
                  option.authorId.equals(round.authorId),
                  option
                ),
              }))
            ),
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
        submitted: z.array(
          z.object({
            me: z.boolean(),
            name: z.string(),
            pictureUrl: z.string(),
          })
        ),
      }),
      z.object({
        stage: z.literal("guess"),
        imageUrl: z.string(),
        stageEnd: z.number(),
        submitted: z.array(
          z.object({
            me: z.boolean(),
            name: z.string(),
            pictureUrl: z.string(),
          })
        ),
        options: z.array(z.string()),
      }),
      z.object({
        stage: z.literal("reveal"),
        imageUrl: z.string(),
        stageEnd: z.number(),
        results: z.array(
          z.object({
            me: z.boolean(),
            name: z.string(),
            pictureUrl: z.string(),
            prompt: z.string(),
            votes: z.array(zId("users")),
            likes: z.array(zId("users")),
            scoreDeltas: z.array(
              z.object({ userId: zId("users"), delta: z.number() })
            ),
          })
        ),
      }),
    ])
  )
);
const CorrectAuthorScore = 1000;
const AlternateAuthorScore = 500;
const CorrectGuesserScore = 200;

export function calculateScoreDeltas(
  isCorrect: boolean,
  option: Document<"rounds">["options"][0]
) {
  const scoreDeltas: { userId: Id<"users">; delta: number }[] = [
    {
      userId: option.authorId,
      delta: option.votes.length * CorrectAuthorScore,
    },
  ];
  if (isCorrect) {
    for (const userId of option.votes) {
      scoreDeltas.push({ userId, delta: CorrectGuesserScore });
    }
  }
  return scoreDeltas;
}

export const addOption = mutation(
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
            option.authorId.equals(session.userId)
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
              option.prompt.toLocaleLowerCase() === prompt.toLocaleLowerCase()
          ) !== -1
        ) {
          return {
            success: false,
            retry: true,
            reason: "This prompt is too similar to existing prompt(s).",
          };
        }

        round.options.push({
          authorId: session.userId,
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

export const guess = mutation(
  withSession(
    withZodObjectArg(
      { roundId: zId("rounds"), prompt: z.string() },
      async ({ db, session }, { roundId, prompt }) => {
        const round = await db.get(roundId);
        if (!round) throw new Error("Round not found");
        if (round.stage !== "guess") {
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
        if (optionVotedFor.authorId.equals(session.userId)) {
          return {
            success: false,
            retry: true,
            reason: "You can't vote for your own prompt.",
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
        await db.patch(round._id, { options: round.options });

        const totalVotes = round.options
          .map((option) => option.votes.length)
          .reduce((total, votes) => total + votes, 0);
        if (totalVotes === round.maxOptions - 1) {
          await db.patch(round._id, revealPatch(round));
        }
        return { success: true, retry: true };
      }
    )
  )
);

// Modifies parameter to progress to guessing
const revealPatch = (
  round: Document<"rounds">
): Partial<Document<"rounds">> => ({
  stage: "reveal",
  maxOptions: round.options.length,
  stageStart: Date.now(),
  stageEnd: Date.now() + RevealDurationMs,
});
