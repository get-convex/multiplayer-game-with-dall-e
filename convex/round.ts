import { api, internal } from "./_generated/api";
import { WithoutSystemFields } from "convex/server";
import { Doc, Id } from "./_generated/dataModel";
import { DatabaseWriter } from "./_generated/server";
import { GuessState, LabelState, MaxPlayers, RevealState } from "./shared";
import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import {
  internalSessionMutation,
  myMutation,
  sessionMutation,
  sessionQuery,
} from "./lib/myFunctions";

const LabelDurationMs = 30000;
const GuessDurationMs = 30000;
const RevealDurationMs = 30000;

export const newRound = (
  authorId: Id<"users">,
  imageStorageId: string,
  prompt: string
): WithoutSystemFields<Doc<"rounds">> => ({
  authorId,
  imageStorageId,
  stage: "label",
  stageStart: Date.now(),
  stageEnd: Date.now() + LabelDurationMs,
  options: [{ prompt, authorId, votes: [], likes: [] }],
});

export const startRound = async (db: DatabaseWriter, roundId: Id<"rounds">) => {
  await db.patch(roundId, {
    stageStart: Date.now(),
    stageEnd: Date.now() + LabelDurationMs,
  });
};

export const getRound = sessionQuery({
  args: { roundId: v.id("rounds") },
  handler: async (
    ctx,
    { roundId }
  ): Promise<LabelState | GuessState | RevealState> => {
    const round = await ctx.db.get(roundId);
    if (!round) throw new Error("Round not found");
    const { stage, stageStart, stageEnd } = round;
    const imageUrl = await ctx.storage.getUrl(round.imageStorageId);
    if (!imageUrl) throw new Error("Image not found");

    const userInfo = async (userId: Id<"users">) => {
      const user = (await ctx.db.get(userId))!;
      return {
        me: user._id === ctx.session?.userId,
        name: user.name,
        pictureUrl: user.pictureUrl,
      };
    };

    switch (stage) {
      case "label":
        const labelState: LabelState = {
          stage,
          mine: round.authorId === ctx.session?.userId,
          imageUrl,
          stageStart,
          stageEnd,
          submitted: await asyncMap(round.options, (option) =>
            userInfo(option.authorId)
          ),
        };
        return labelState;
      case "guess":
        const allGuesses = round.options.reduce(
          (all, { votes }) => all.concat(votes),
          [] as Id<"users">[]
        );
        const myGuess = round.options.find(
          (o) => !!o.votes.find((voteId) => voteId === ctx.session?.userId)
        )?.prompt;
        const myPrompt = round.options.find(
          (o) => o.authorId === ctx.session?.userId
        )?.prompt;
        const guessState: GuessState = {
          options: round.options.map((option) => option.prompt),
          stage,
          mine: round.authorId === ctx.session?.userId,
          imageUrl,
          stageStart,
          stageEnd,
          myPrompt,
          myGuess,
          submitted: await asyncMap(allGuesses, userInfo),
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
            authorId: option.authorId,
            prompt: option.prompt,
            votes: option.votes.map((uId) => uId),
            likes: option.likes.map((uId) => uId),
            scoreDeltas: calculateScoreDeltas(
              option.authorId === round.authorId,
              option
            ),
          })),
          stage,
          me: ctx.session!.userId,
          authorId: round.authorId,
          imageUrl,
          stageStart,
          stageEnd,
          users: await asyncMap(allUsers.keys(), async (userId) => ({
            userId,
            ...(await userInfo(userId)),
          })),
        };
        return revealState;
    }
  },
});

const CorrectAuthorScore = 1000;
const AlternateAuthorScore = 500;
const CorrectGuesserScore = 200;

export function calculateScoreDeltas(
  isCorrect: boolean,
  option: Doc<"rounds">["options"][0]
) {
  const scoreDeltas = [
    {
      userId: option.authorId,
      score:
        option.votes.length *
        (isCorrect ? CorrectAuthorScore : AlternateAuthorScore),
    },
  ];
  if (isCorrect) {
    for (const userId of option.votes) {
      scoreDeltas.push({ userId, score: CorrectGuesserScore });
    }
  }
  return scoreDeltas;
}

// Courtesy of chat-gpt
function levenshteinDistance(a: string, b: string) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  // Initialize the first row and column of the matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Calculate the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export type OptionResult =
  | { success: true }
  | { success: false; retry?: boolean; reason: string };

export const addOption = internalSessionMutation({
  args: {
    gameId: v.optional(v.id("games")),
    roundId: v.id("rounds"),
    prompt: v.string(),
  },
  handler: async (ctx, { gameId, roundId, prompt }): Promise<OptionResult> => {
    const round = await ctx.db.get(roundId);
    if (!round) throw new Error("Round not found");
    if (round.stage !== "label") {
      return { success: false, reason: "Too late to add a prompt." };
    }
    if (round.authorId === ctx.session.userId) {
      throw new Error("You can't submit a prompt for your own image.");
    }
    if (
      round.options.findIndex(
        (option) => option.authorId === ctx.session.userId
      ) !== -1
    ) {
      return { success: false, reason: "You already added a prompt." };
    }
    if (round.options.length === MaxPlayers) {
      return { success: false, reason: "This round is full." };
    }
    if (
      round.options.findIndex(
        (option) =>
          levenshteinDistance(
            option.prompt.toLocaleLowerCase(),
            prompt.toLocaleLowerCase()
          ) <
          prompt.length / 2
      ) !== -1
    ) {
      return {
        success: false,
        retry: true,
        reason: "This prompt is too similar to existing prompt(s).",
      };
    }

    round.options.push({
      authorId: ctx.session.userId,
      prompt,
      votes: [],
      likes: [],
    });
    await ctx.db.patch(round._id, { options: round.options });
    const game = gameId && (await ctx.db.get(gameId));
    if (round.options.length === game?.playerIds.length) {
      // All players have added options
      await ctx.db.patch(round._id, beginGuessPatch(round));
      await ctx.scheduler.runAfter(GuessDurationMs, api.round.progress, {
        roundId: round._id,
        fromStage: "guess",
      });
    }
    return { success: true };
  },
});

export const progress = myMutation({
  args: {
    roundId: v.id("rounds"),
    fromStage: v.union(
      v.literal("label"),
      v.literal("guess"),
      v.literal("reveal")
    ),
  },
  handler: async (ctx, { roundId, fromStage }) => {
    const round = await ctx.db.get(roundId);
    if (!round) throw new Error("Round not found: " + roundId);
    if (round.stage === fromStage) {
      const stage = fromStage === "label" ? "guess" : "reveal";
      await ctx.db.patch(round._id, { stage });
    }
  },
});

// from https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle<T extends {}>(array: T[]): T[] {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

// Modifies parameter to progress to guessing
const beginGuessPatch = (round: Doc<"rounds">): Partial<Doc<"rounds">> => ({
  options: shuffle(round.options),
  stage: "guess",
  stageStart: Date.now(),
  stageEnd: Date.now() + GuessDurationMs,
});

export const guess = sessionMutation({
  args: {
    roundId: v.id("rounds"),
    prompt: v.string(),
    gameId: v.optional(v.id("games")),
  },
  handler: async (ctx, { roundId, prompt, gameId }) => {
    const round = await ctx.db.get(roundId);
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
    if (optionVotedFor.authorId === ctx.session.userId) {
      return {
        success: false,
        retry: true,
        reason: "You can't vote for your own prompt.",
      };
    }
    const existingVote = round.options.find(
      (option) =>
        option.votes.findIndex((vote) => vote === ctx.session.userId) !== -1
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
      const voteIndex = existingVote.votes.indexOf(ctx.session.userId);
      existingVote.votes = existingVote.votes
        .slice(0, voteIndex)
        .concat(...existingVote.votes.slice(voteIndex + 1));
    }
    optionVotedFor.votes.push(ctx.session.userId);
    await ctx.db.patch(round._id, { options: round.options });

    if (gameId) {
      const game = (await ctx.db.get(gameId))!;
      const noGuess = new Set(game.playerIds.map((id) => id.toString()));
      noGuess.delete(round.authorId.toString());
      for (const option of round.options) {
        for (const vote of option.votes) {
          noGuess.delete(vote.toString());
        }
      }
      if (noGuess.size === 0) {
        await ctx.db.patch(round._id, revealPatch(round));
      }
    }
    return { success: true, retry: true };
  },
});

export const like = sessionMutation({
  args: {
    roundId: v.id("rounds"),
    prompt: v.string(),
    gameId: v.optional(v.id("games")),
  },
  handler: async (ctx, { roundId, prompt, gameId }) => {
    const round = await ctx.db.get(roundId);
    if (!round) throw new Error("Round not found");
    if (round.stage !== "guess") {
      return { success: false, reason: "Too late to like." };
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
    if (optionVotedFor.authorId === ctx.session.userId) {
      return {
        success: false,
        retry: true,
        reason: "You can't like your own prompt.",
      };
    }
    const existingLike = round.options.find(
      (option) =>
        option.likes.findIndex((like) => like === ctx.session.userId) !== -1
    );
    if (prompt === existingLike?.prompt) {
      return {
        success: false,
        retry: true,
        reason: "You already voted for this option.",
      };
    }
    optionVotedFor.likes.push(ctx.session.userId);
    await ctx.db.patch(round._id, { options: round.options });
    [];
  },
});

// Modifies parameter to progress to guessing
const revealPatch = (round: Doc<"rounds">) => ({
  stage: "reveal" as const,
  stageStart: Date.now(),
  stageEnd: Date.now() + RevealDurationMs,
});

// Return the server's current time so clients can calculate timestamp offsets.
export const serverNow = myMutation(() => Date.now());
