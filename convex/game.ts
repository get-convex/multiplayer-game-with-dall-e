import { api } from "./_generated/api";
import { calculateScoreDeltas, newRound, startRound } from "./round";
import { mutationWithSession, queryWithSession } from "./lib/withSession";
import { ClientGameState, MaxPlayers } from "./shared";
import { getUserById } from "./users";
import { Doc, Id } from "./_generated/dataModel";
import { randomSlug } from "./lib/randomSlug";
import { v } from "convex/values";
import { asyncMap, getAll, pruneNull } from "./lib/relationships";

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

export const playAgain = mutationWithSession({
  args: { oldGameId: v.id("games") },
  handler: async ({ db, session }, { oldGameId }) => {
    const oldGame = await db.get(oldGameId);
    if (!oldGame) throw new Error("Old game doesn't exist");
    if (!oldGame.playerIds.find((id) => id === session.userId)) {
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
  },
});

export const get = queryWithSession({
  args: { gameId: v.id("games") },
  handler: async ({ db, session }, { gameId }): Promise<ClientGameState> => {
    // Grab the most recent game with this code.
    const game = await db.get(gameId);
    if (!game) throw new Error("Game not found");
    const rounds = pruneNull(await getAll(db, game.roundIds));
    const playerLikes = new Map<Id<"users">, number>();
    const playerScore = new Map<Id<"users">, number>();
    for (const round of rounds) {
      if (round.stage === "reveal") {
        for (const option of round.options) {
          playerLikes.set(
            option.authorId,
            option.likes.length + (playerLikes.get(option.authorId) ?? 0)
          );
          for (const [userId, delta] of calculateScoreDeltas(
            option.authorId === round.authorId,
            option
          )) {
            playerScore.set(userId, delta + (playerScore.get(userId) ?? 0));
          }
        }
      }
    }
    const roundPlayerIds = rounds.map((round) => round.authorId);
    const players = await asyncMap(game.playerIds, async (playerId) => {
      const player = (await getUserById(db, playerId))!;
      const { name, pictureUrl } = player;
      return {
        me: player._id === session?.userId,
        name,
        pictureUrl,
        score: playerScore.get(player._id) ?? 0,
        likes: playerLikes.get(player._id) ?? 0,
        submitted: !!roundPlayerIds.find((id) => id === playerId),
      };
    });
    return {
      gameCode: game.slug,
      hosting: game.hostId === session?.userId,
      playing: !!game.playerIds.find((id) => id === session?.userId),
      players,
      state: game.state,
      nextGameId: game.nextGameId ?? null,
    };
  },
});

export const join = mutationWithSession({
  args: { gameCode: v.string() },
  handler: async ({ db, session }, { gameCode }) => {
    // Grab the most recent game with this gameCode, if it exists
    const game = await db
      .query("games")
      .withIndex("s", (q) => q.eq("slug", gameCode))
      .order("desc")
      .first();
    if (!game) throw new Error("Game not found");
    if (game.playerIds.length >= MaxPlayers) throw new Error("Game is full");
    if (game.state.stage !== "lobby") throw new Error("Game has started");
    // keep session up to date, so we know what game this session's in.
    session.gameIds.push(game._id);
    await db.patch(session._id, { gameIds: session.gameIds });
    // Already in game
    if (game.playerIds.find((id) => id === session.userId) !== undefined) {
      console.warn("User joining game they're already in");
    } else {
      const playerIds = game.playerIds;
      playerIds.push(session.userId);
      await db.patch(game._id, { playerIds });
    }

    return game._id;
  },
});

export const submit = mutationWithSession({
  args: { submissionId: v.id("submissions"), gameId: v.id("games") },
  handler: async ({ db, session }, { submissionId, gameId }) => {
    const game = await db.get(gameId);
    if (!game) throw new Error("Game not found");
    const submission = await db.get(submissionId);
    if (submission?.result.status !== "saved") {
      throw new Error(`Can't add ${submission?.result.status} submissions.`);
    }
    if (submission.authorId !== session.userId) {
      throw new Error("This is not your submission.");
    }
    const { authorId, prompt, result } = submission;
    for (const roundId of game.roundIds) {
      const round = (await db.get(roundId))!;
      if (round.authorId === authorId) {
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
      await startRound(db, game.roundIds[0]);
    }
  },
});

export const progress = mutationWithSession({
  args: {
    gameId: v.id("games"),
    fromStage: v.union(
      v.literal("lobby"),
      v.literal("generate"),
      v.literal("label"),
      v.literal("guess"),
      v.literal("reveal"),
      v.literal("rounds"),
      v.literal("votes"),
      v.literal("recap")
    ),
  },
  handler: async ({ db, session, scheduler }, { gameId, fromStage }) => {
    const game = await db.get(gameId);
    if (!game) throw new Error("Game not found");
    if (game.hostId !== session.userId) throw new Error("You are not the host");
    const state = nextState(game.state, game.roundIds);
    if (game.state.stage !== fromStage) {
      // Just ignore requests that have already been applied.
      if (fromStage === state.stage) return;
      throw new Error(
        `Game ${gameId}(${game.state.stage}) is no longer in stage ${fromStage}`
      );
    }
    if (state.stage === "rounds") {
      await startRound(db, state.roundId);
    }
    game.state = state;
    await db.replace(game._id, game);
    if (state.stage === "lobby") {
      scheduler.runAfter(GenerateDurationMs, api.game.progress, {
        sessionId: session._id,
        gameId,
        fromStage: state.stage,
      });
    }
  },
});

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
      if (state.roundId === roundIds[roundIds.length - 1]) {
        // If it was the last round, go to recap.
        state = { stage: "recap" };
      } else {
        // Otherwise go to the next round.
        const lastRoundId = state.roundId;
        const prevIndex = roundIds.findIndex(
          (roundId) => roundId === lastRoundId
        );
        if (prevIndex === -1) throw new Error("Previous round doesn't exist");
        state.roundId = roundIds[prevIndex + 1];
      }
      break;
  }
  return state;
};
