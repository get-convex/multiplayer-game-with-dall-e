import { beginGuessPatch, MaxOptions, newRound } from "./round";
import { mutation, query } from "./_generated/server";

export const get = query(async ({ db }) => {
  const publicGame = await db.query("publicGame").unique();
  if (!publicGame) {
    console.warn("No public game currently.");
    return null;
  }
  // TODO: return round info
  return publicGame.roundId;
});

const PublicGuessMs = 15000;
const PublicRevealMs = 5000;

export const progress = mutation(
  async ({ db, scheduler }, fromStage: "guess" | "reveal") => {
    const publicGame = await db.query("publicGame").unique();
    if (!publicGame) throw new Error("No public game");
    const currentRound = await db.get(publicGame.roundId);
    if (!currentRound) throw new Error("Round not found");

    if (currentRound.stageEnd! > Date.now()) {
      throw new Error("Previous round not over.");
    }
    if (currentRound.stage !== fromStage) {
      console.log("skipping progress: already in the right stage");
      return;
    }
    if (currentRound.stage === "guess") {
      await db.patch(currentRound._id, { stage: "reveal" });
      scheduler.runAfter(PublicRevealMs, "publicGame:progress", "guess");
      return;
    }
    if (currentRound.stage !== "reveal") {
      throw new Error(`Invalid stage: ${currentRound.stage}`);
    }
    const round = await db
      .query("rounds")
      .withIndex("public_game", (q) =>
        q.eq("publicRound", true).eq("stage", "reveal")
      )
      .order("asc")
      .first();
    if (!round) throw new Error("No public round.");
    Object.assign(round, beginGuessPatch(round));
    for (const option of round.options) {
      option.likes = [];
      option.votes = [];
    }
    round.lastUsed = Date.now();
    if (round.stage !== "reveal") throw new Error("<never>");
    const roundId = await db.insert("rounds", round);
    await db.patch(publicGame._id, { roundId });
    scheduler.runAfter(PublicGuessMs, "publicGame:progress", "guess");
  }
);
