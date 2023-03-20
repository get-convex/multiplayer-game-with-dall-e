import { z } from "zod";
import { withZodArgs, withZodObjectArg } from "./lib/withZod";
import { zId } from "./lib/zodUtils";
import { calculateScoreDeltas, MaxOptions, newRound } from "./round";
import { mutationWithSession, queryWithSession } from "./lib/withSession";
import { ClientGameStateZ } from "./shared";
import { getUserById } from "./users";
import { Doc, Id } from "./_generated/dataModel";

const GenerateDurationMs = 120000;

export const create = mutationWithSession(async ({ db, session }) => {
  const gameId = await db.insert("games", {
    hostId: session.userId,
    playerIds: [session.userId],
    roundIds: [],
    slug: randomSlug(),
    state: { stage: "lobby" },
  });
  session.gameIds.push(gameId);
  await db.patch(session._id, { gameIds: session.gameIds });
  return gameId;
});

export const playAgain = mutationWithSession(
  withZodArgs([zId("games")], async ({ db, session }, oldGameId) => {
    const oldGame = await db.get(oldGameId);
    if (!oldGame) throw new Error("Old game doesn't exist");
    if (!oldGame.playerIds.find((id) => id.equals(session.userId))) {
      throw new Error("You weren't part of that game");
    }
    const gameId = await db.insert("games", {
      hostId: session.userId,
      playerIds: oldGame.playerIds,
      roundIds: [],
      slug: oldGame.slug,
      state: { stage: "lobby" },
    });
    await db.patch(oldGame._id, { nextGameId: gameId });
    session.gameIds.push(gameId);
    await db.patch(session._id, { gameIds: session.gameIds });
    return gameId;
  })
);

export const get = queryWithSession(
  withZodArgs(
    [zId("games")],
    async ({ db, session }, gameId) => {
      // Grab the most recent game with this code.
      const game = await db.get(gameId);
      if (!game) throw new Error("Game not found");
      const rounds = await Promise.all(
        game.roundIds.map(async (roundId) => (await db.get(roundId))!)
      );
      const playerLikes = new Map<string, number>();
      const playerScore = new Map<string, number>();
      for (const round of rounds) {
        if (round.stage === "reveal") {
          for (const option of round.options) {
            playerLikes.set(
              option.authorId.id,
              option.likes.length + (playerLikes.get(option.authorId.id) ?? 0)
            );
            for (const [userId, delta] of calculateScoreDeltas(
              option.authorId.equals(round.authorId),
              option
            )) {
              playerScore.set(userId, delta + (playerScore.get(userId) ?? 0));
            }
          }
        }
      }
      const roundPlayerIds = rounds.map((round) => round.authorId);
      const players = await Promise.all(
        game.playerIds.map(async (playerId) => {
          const player = (await getUserById(db, playerId))!;
          const { name, pictureUrl } = player;
          return {
            me: player._id.equals(session?.userId),
            name,
            pictureUrl,
            score: playerScore.get(player._id.id) ?? 0,
            likes: playerLikes.get(player._id.id) ?? 0,
            submitted: !!roundPlayerIds.find((id) => id.equals(playerId)),
          };
        })
      );
      return {
        gameCode: game.slug,
        hosting: game.hostId.equals(session?.userId),
        playing: !!game.playerIds.find((id) => id.equals(session?.userId)),
        players,
        state: game.state,
        nextGameId: game.nextGameId ?? null,
      };
    },
    ClientGameStateZ
  )
);

export const join = mutationWithSession(
  withZodArgs([z.string().length(4)], async ({ db, session }, slug: string) => {
    // Grab the most recent game with this slug, if it exists
    const game = await db
      .query("games")
      .withIndex("s", (q) => q.eq("slug", slug))
      .order("desc")
      .first();
    if (!game) throw new Error("Game not found");
    if (game.playerIds.length >= MaxOptions) throw new Error("Game is full");
    if (game.state.stage !== "lobby") throw new Error("Game has started");
    // keep session up to date, so we know what game this session's in.
    session.gameIds.push(game._id);
    await db.patch(session._id, { gameIds: session.gameIds });
    // Already in game
    if (game.playerIds.find((id) => id.equals(session.userId)) !== undefined) {
      console.warn("User joining game they're already in");
    } else {
      const playerIds = game.playerIds;
      playerIds.push(session.userId);
      await db.patch(game._id, { playerIds });
    }

    return game._id;
  })
);

export const submit = mutationWithSession(
  withZodObjectArg(
    { submissionId: zId("submissions"), gameId: zId("games") },
    async ({ db, session }, { submissionId, gameId }) => {
      const game = await db.get(gameId);
      if (!game) throw new Error("Game not found");
      const submission = await db.get(submissionId);
      if (submission?.result.status !== "saved") {
        throw new Error(`Can't add ${submission?.result.status} submissions.`);
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
          newRound(authorId, result.imageStorageId, prompt)
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
);

export const progress = mutationWithSession(
  withZodArgs(
    [
      zId("games"),
      z.union([
        z.literal("lobby"),
        z.literal("generate"),
        z.literal("label"),
        z.literal("guess"),
        z.literal("reveal"),
        z.literal("rounds"),
        z.literal("votes"),
        z.literal("recap"),
      ]),
    ],
    async ({ db, session, scheduler }, gameId, fromStage) => {
      const game = await db.get(gameId);
      if (!game) throw new Error("Game not found");
      if (!game.hostId.equals(session.userId))
        throw new Error("You are not the host");
      const state = nextState(game.state, game.roundIds);
      if (game.state.stage !== fromStage) {
        // Just ignore requests that have already been applied.
        if (fromStage === state.stage) return;
        throw new Error(
          `Game ${gameId}(${game.state.stage}) is no longer in stage ${fromStage}`
        );
      }
      await db.patch(game._id, { state });
      if (state.stage !== "generate") {
        scheduler.runAfter(
          GenerateDurationMs,
          "game:progress",
          session._id,
          gameId,
          state.stage
        );
      }
    }
  )
);

const nextState = (
  fromState: Doc<"games">["state"],
  roundIds: Id<"rounds">[]
): Doc<"games">["state"] => {
  let state = { ...fromState };
  switch (state.stage) {
    case "lobby":
      state.stage = "generate";
      break;
    case "generate":
      if (roundIds.length === 0) throw new Error("Game has no rounds");
      state = {
        stage: "rounds",
        roundId: roundIds[0],
      };
      break;
    case "rounds":
      if (state.roundId.equals(roundIds[roundIds.length - 1])) {
        // If it was the last round, go to recap.
        state = { stage: "recap" };
      } else {
        // Otherwise go to the next round.
        const lastRoundId = state.roundId;
        const prevIndex = roundIds.findIndex((roundId) =>
          roundId.equals(lastRoundId)
        );
        if (prevIndex === -1) throw new Error("Previous round doesn't exist");
        state.roundId = roundIds[prevIndex + 1];
      }
      break;
  }
  return state;
};

const LETTERS = [
  "B",
  "C",
  "D",
  "F",
  "G",
  "H",
  "J",
  "K",
  "L",
  "M",
  "N",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "V",
  "W",
  "X",
  "Z",
  "2",
  "5",
  "6",
  "9",
];
export const randomSlug = (): string => {
  var acc = [];
  for (var i = 0; i < 4; i++) {
    acc.push(LETTERS[Math.floor(Math.random() * LETTERS.length)]);
  }
  return acc.join("");
};
