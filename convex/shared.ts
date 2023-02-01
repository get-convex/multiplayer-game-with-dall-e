/**
 * File shared between client & server.
 * Do not import any client-specific or server-specific code
 */

import { z } from "zod";
import { zId } from "./lib/zodUtils";

export const ClientGameStateZ = z.object({
  gameId: zId("games"),
  hosting: z.boolean(),
  players: z.array(
    z.object({
      name: z.string(),
      pictureUrl: z.string(),
      submitted: z.boolean(),
    })
  ),
  state: z.union([
    z.object({
      stage: z.union([
        z.literal("lobby"),
        z.literal("generate"),
        z.literal("recap"),
      ]),
    }),
    z.object({
      stage: z.literal("rounds"),
      roundId: zId("rounds"),
    }),
  ]),
});

export type ClientGameState = z.infer<typeof ClientGameStateZ>;
