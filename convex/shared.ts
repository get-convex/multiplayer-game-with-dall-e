/**
 * File shared between client & server.
 * Do not import any client-specific or server-specific code
 */

import { z } from "zod";
import { zId } from "./lib/zodUtils";

export const ClientGameStateZ = z.object({
  gameCode: z.string(),
  hosting: z.boolean(),
  players: z.array(
    z.object({
      me: z.boolean(),
      name: z.string(),
      pictureUrl: z.string(),
      submitted: z.boolean(),
      score: z.number(),
      likes: z.number(),
    })
  ),
  state: z.union([
    z.object({
      stage: z.union([z.literal("lobby"), z.literal("generate")]),
    }),
    z.object({
      stage: z.literal("rounds"),
      roundId: zId("rounds"),
    }),
    z.object({
      stage: z.literal("recap"),
    }),
  ]),
  nextGameId: z.nullable(zId("games")),
});

export type ClientGameState = z.infer<typeof ClientGameStateZ>;

export const LabelStateZ = z.object({
  stage: z.literal("label"),
  mine: z.boolean(),
  imageUrl: z.string(),
  stageEnd: z.number(),
  submitted: z.array(
    z.object({
      me: z.boolean(),
      name: z.string(),
      pictureUrl: z.string(),
    })
  ),
});

export type LabelState = z.infer<typeof LabelStateZ>;

export const GuessStateZ = z.object({
  stage: z.literal("guess"),
  mine: z.boolean(),
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
});

export type GuessState = z.infer<typeof GuessStateZ>;

export const RevealStateZ = z.object({
  stage: z.literal("reveal"),
  mine: z.boolean(),
  imageUrl: z.string(),
  stageEnd: z.number(),
  results: z.array(
    z.object({
      me: z.boolean(),
      actual: z.boolean(),
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
});

export type RevealState = z.infer<typeof RevealStateZ>;
