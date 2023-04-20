import { WithoutSystemFields } from "convex/server";
import { z } from "zod";
import { withZodObjectArg } from "./lib/withZod";
import { zId } from "./lib/zodUtils";
import {
  mutationWithSession,
  queryWithSession,
  withSession,
} from "./lib/withSession";
import { Doc, Id } from "./_generated/dataModel";
import {
  DatabaseWriter,
  MutationCtx,
  internalMutation,
  mutation,
} from "./_generated/server";
import {
  GuessState,
  GuessStateZ,
  LabelState,
  LabelStateZ,
  MaxPlayers,
  RevealState,
  RevealStateZ,
} from "./shared";

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

export const getRound = queryWithSession(
  withZodObjectArg(
    { roundId: zId("rounds") },
    async ({ db, session, storage }, { roundId }) => {
      const round = await db.get(roundId);
      if (!round) throw new Error("Round not found");
      const { stage, stageStart, stageEnd } = round;
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
            stageStart,
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
          const myGuess = round.options.find(
            (o) => !!o.votes.find((voteId) => voteId.equals(session?.userId))
          )?.prompt;
          const myPrompt = round.options.find((o) =>
            o.authorId.equals(session?.userId)
          )?.prompt;
          const guessState: GuessState = {
            options: round.options.map((option) => option.prompt),
            stage,
            mine: round.authorId.equals(session?.userId),
            imageUrl,
            stageStart,
            stageEnd,
            myPrompt,
            myGuess,
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
            stageStart,
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
  option: Doc<"rounds">["options"][0]
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

const OptionResultZ = z.union([
  z.object({ success: z.literal(true) }),
  z.object({
    success: z.literal(false),
    retry: z.optional(z.boolean()),
    reason: z.string(),
  }),
]);
export type OptionResult = z.infer<typeof OptionResultZ>;

export const addOption = internalMutation(
  withSession(
    async (
      // TODO: why doesn't this work out of the box?
      { db, scheduler, session }: MutationCtx & { session: Doc<"sessions"> },
      {
        gameId,
        roundId,
        prompt,
      }: { gameId?: Id<"games">; roundId: Id<"rounds">; prompt: string }
    ): Promise<OptionResult> => {
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
        authorId: session.userId,
        prompt,
        votes: [],
        likes: [],
      });
      await db.patch(round._id, { options: round.options });
      const game = gameId && (await db.get(gameId));
      if (round.options.length === game?.playerIds.length) {
        // All players have added options
        await db.patch(round._id, beginGuessPatch(round));
        scheduler.runAfter(GuessDurationMs, "round:progress", {
          roundId: round._id,
          fromStage: "guess",
        });
      }
      return { success: true };
    }
  )
);

export const progress = mutation(
  async (
    { db },
    {
      roundId,
      fromStage,
    }: { roundId: Id<"rounds">; fromStage: Doc<"rounds">["stage"] }
  ) => {
    const round = await db.get(roundId);
    if (!round) throw new Error("Round not found: " + roundId.id);
    if (round.stage === fromStage) {
      const stage = fromStage === "label" ? "guess" : "reveal";
      await db.patch(round._id, { stage });
    }
  }
);

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

export const guess = mutationWithSession(
  withZodObjectArg(
    {
      roundId: zId("rounds"),
      prompt: z.string(),
      gameId: z.optional(zId("games")),
    },
    async ({ db, session }, { roundId, prompt, gameId }) => {
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
        existingVote.votes = existingVote.votes
          .slice(0, voteIndex)
          .concat(...existingVote.votes.slice(voteIndex + 1));
      }
      optionVotedFor.votes.push(session.userId);
      await db.patch(round._id, { options: round.options });

      if (gameId) {
        const game = (await db.get(gameId))!;
        const noGuess = new Set(game.playerIds.map((id) => id.toString()));
        noGuess.delete(round.authorId.toString());
        for (const option of round.options) {
          for (const vote of option.votes) {
            noGuess.delete(vote.toString());
          }
        }
        if (noGuess.size === 0) {
          await db.patch(round._id, revealPatch(round));
        }
      }
      return { success: true, retry: true };
    }
  )
);

export const like = mutationWithSession(
  withZodObjectArg(
    {
      roundId: zId("rounds"),
      prompt: z.string(),
      gameId: z.optional(zId("games")),
    },
    async ({ db, session }, { roundId, prompt, gameId }) => {
      const round = await db.get(roundId);
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
      if (optionVotedFor.authorId.equals(session.userId)) {
        return {
          success: false,
          retry: true,
          reason: "You can't like your own prompt.",
        };
      }
      const existingLike = round.options.find(
        (option) =>
          option.likes.findIndex((like) => like.equals(session.userId)) !== -1
      );
      if (prompt === existingLike?.prompt) {
        return {
          success: false,
          retry: true,
          reason: "You already voted for this option.",
        };
      }
      optionVotedFor.likes.push(session.userId);
      await db.patch(round._id, { options: round.options });
      [];
    }
  )
);

// Modifies parameter to progress to guessing
const revealPatch = (round: Doc<"rounds">) => ({
  stage: "reveal" as const,
  stageStart: Date.now(),
  stageEnd: Date.now() + RevealDurationMs,
});

// Return the server's current time so clients can calculate timestamp offsets.
export const serverNow = mutation(() => Date.now());
