import { z } from "zod";
import withZodArgs, { withZodObjectArg } from "./lib/withZod";
import { zId } from "./lib/zodUtils";
import { MaxOptions, newRound } from "./round";
import { withSession } from "./sessions";
import { ClientGameStateZ } from "./shared";
import { getUserById } from "./users";
import { Document, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

export const create = mutation(
  withSession(async ({ db, session }) => {
    const gameId = await db.insert("games", {
      hostId: session.userId,
      playerIds: [session.userId],
      roundIds: [],
      slug: randomSlug(),
      state: { stage: "lobby" },
    });
    await db.patch(session._id, { gameId });
    return gameId;
  })
);

export const get = query(
  withSession(
    withZodArgs(
      [z.string()],
      async ({ db, session }, gameCode) => {
        // Grab the most recent game with this code.
        const game = await db
          .query("games")
          .withIndex("s", (q) => q.eq("slug", gameCode))
          .order("desc")
          .first();
        if (!game) throw new Error("Game not found");
        if (!game.playerIds.find((id) => id.equals(session.userId))) {
          throw new Error("Player not part of this game");
        }
        const roundPlayerIs = await Promise.all(
          game.roundIds.map(async (roundId) => {
            const round = (await db.get(roundId))!;
            return round.authorId;
          })
        );
        const players = await Promise.all(
          game.playerIds.map(async (playerId) => {
            const player = (await getUserById(db, playerId))!;
            const { name, pictureUrl } = player;
            return {
              me: player._id.equals(session.userId),
              name,
              pictureUrl,
              submitted: !!roundPlayerIs.find((id) => id.equals(playerId)),
            };
          })
        );
        return {
          gameId: game._id,
          hosting: game.hostId.equals(session.userId),
          players,
          state: game.state,
        };
      },
      ClientGameStateZ
    )
  )
);

export const join = mutation(
  withSession(
    withZodArgs([z.string()], async ({ db, session }, slug: string) => {
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
      await db.patch(session._id, { gameId: game._id });
      // Already in game
      if (
        game.playerIds.find((id) => id.equals(session.userId)) === undefined
      ) {
        console.warn("User joining game they're already in");
      } else {
        const playerIds = game.playerIds;
        playerIds.push(session.userId);
        await db.patch(game._id, { playerIds });
      }

      return game._id;
    })
  )
);

export const submit = mutation(
  withSession(
    withZodObjectArg(
      { prompt: z.string(), imageStorageId: z.string(), gameId: zId("games") },
      async ({ db, session }, { prompt, imageStorageId, gameId }) => {
        const game = await db.get(gameId);
        if (!game) throw new Error("Game not found");
        // TODO: check they haven't submitted already.
        const submissionId = await db.insert("submissions", {
          imageStorageId,
          prompt,
          authorId: session.userId,
        });
        const roundIds = game.roundIds;
        roundIds.push(
          await db.insert(
            "rounds",
            newRound(session.userId, submissionId, game.playerIds.length)
          )
        );
        const patch: Partial<Document<"games">> = { roundIds };
        // Start the game, everyone's submitted.
        if (roundIds.length === game.playerIds.length) {
          patch.state = { stage: "rounds", roundId: game.roundIds[0] };
        }
        await db.patch(game._id, patch);
      }
    )
  )
);

export const progress = mutation(
  withSession(
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
      async ({ db, session }, gameId, fromStage) => {
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
      }
    )
  )
);

const nextState = (
  state: Document<"games">["state"],
  roundIds: Id<"rounds">[]
): Document<"games">["state"] => {
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
