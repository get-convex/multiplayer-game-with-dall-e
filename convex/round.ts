import { WithoutSystemFields } from "convex/server";
import { optional, z } from "zod";
import withZodArgs, { withZodObjectArg } from "./lib/withZod";
import { zId } from "./lib/zodUtils";
import { queryWithSession, withSession } from "./lib/withSession";
import { Document, Id } from "./_generated/dataModel";
import { mutation } from "./_generated/server";
import {
  GuessState,
  GuessStateZ,
  LabelState,
  LabelStateZ,
  RevealState,
  RevealStateZ,
} from "./shared";

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
      if (!imageUrl) throw new Error("Image not found");

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
          const labelState: LabelState = {
            stage,
            mine: round.authorId.equals(session?.userId),
            imageUrl,
            stageEnd,
            submitted: await Promise.all(
              round.options.map((option) => userInfo(option.authorId))
            ),
          };
          return labelState;
        case "guess":
          const allGuesses = round.options.reduce(
            (all, { votes }) => all.concat(votes),
            [] as Id<"users">[]
          );
          const guessState: GuessState = {
            options: round.options.map((option) => option.prompt),
            stage,
            mine: round.authorId.equals(session?.userId),
            imageUrl,
            stageEnd,
            submitted: await Promise.all(allGuesses.map(userInfo)),
          };
          return guessState;
        case "reveal":
          const allUsers = new Set(
            round.options.map((option) => option.authorId)
          );

          round.options.forEach((option) => {
            for (const id of option.votes) {
              allUsers.add(id);
            }
            for (const id of option.likes) {
              allUsers.add(id);
            }
          });
          const revealState: RevealState = {
            results: round.options.map((option) => ({
              authorId: option.authorId.id,
              prompt: option.prompt,
              votes: option.votes.map((uId) => uId.id),
              likes: option.likes.map((uId) => uId.id),
              scoreDeltas: calculateScoreDeltas(
                option.authorId.equals(round.authorId),
                option
              ),
            })),
            stage,
            me: session!.userId.id,
            authorId: round.authorId.id,
            imageUrl,
            stageEnd,
            users: new Map(
              await Promise.all(
                [...allUsers.keys()].map(
                  async (userId) => [userId.id, await userInfo(userId)] as const
                )
              )
            ),
          };
          return revealState;
      }
    },
    z.union([LabelStateZ, GuessStateZ, RevealStateZ])
  )
);
const CorrectAuthorScore = 1000;
const AlternateAuthorScore = 500;
const CorrectGuesserScore = 200;

export function calculateScoreDeltas(
  isCorrect: boolean,
  option: Document<"rounds">["options"][0]
) {
  const scoreDeltas = new Map([
    [
      option.authorId.id,
      option.votes.length *
        (isCorrect ? CorrectAuthorScore : AlternateAuthorScore),
    ],
  ]);
  if (isCorrect) {
    for (const userId of option.votes) {
      scoreDeltas.set(userId.id, CorrectGuesserScore);
    }
  }
  return scoreDeltas;
}

export const addOption = mutation(
  withSession(
    withZodObjectArg(
      { roundId: zId("rounds"), prompt: z.string() },
      async ({ db, scheduler, session }, { roundId, prompt }) => {
        const round = await db.get(roundId);
        if (!round) throw new Error("Round not found");
        if (round.stage !== "label") {
          return { success: false, reason: "Too late to add a prompt." };
        }
        if (round.authorId.equals(session.userId)) {
          throw new Error("You can't submit a prompt for your own image.");
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
        await db.patch(round._id, { options: round.options });
        if (round.options.length === round.maxOptions) {
          await db.patch(round._id, beginGuessPatch(round));
          scheduler.runAfter(
            GuessDurationMs,
            "round:progress",
            round._id,
            "guess"
          );
        }
        return { success: true };
      }
    )
  )
);

export const progress = mutation(
  async (
    { db },
    roundId: Id<"rounds">,
    fromStage: Document<"rounds">["stage"]
  ) => {
    const round = await db.get(roundId);
    if (!round) throw new Error("Round not found: " + roundId.id);
    if (round.stage === fromStage) {
      const stage = fromStage === "label" ? "guess" : "reveal";
      await db.patch(round._id, { stage });
    }
  }
);

// Modifies parameter to progress to guessing
const beginGuessPatch = (
  round: Document<"rounds">
): Partial<Document<"rounds">> => ({
  options: round.options.sort(() => Math.random() - 0.5),
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
          (option) => option.prompt === prompt
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
const revealPatch = (round: Document<"rounds">) => ({
  stage: "reveal" as const,
  maxOptions: round.options.length,
  stageStart: Date.now(),
  stageEnd: Date.now() + RevealDurationMs,
});

// Return the server's current time so clients can calculate timestamp offsets.
export const serverNow = mutation(() => Date.now());
