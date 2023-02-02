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
