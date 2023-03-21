import { mutation, query } from "./_generated/server";

export const get = query(async ({ db }) => {
  const publicGame = await db.query("publicGame").unique();
  if (!publicGame) {
    console.warn("No public game currently.");
    return null;
  }
  return publicGame.roundId;
});

const PublicGuessMs = 15000;
const PublicRevealMs = 10000;

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
      return "noop";
    }
    if (currentRound.stage === "guess") {
      if (
        !currentRound.options.find(
          (option) => option.likes.length || option.votes.length
        )
      ) {
        scheduler.runAfter(PublicGuessMs, "publicGame:progress", "guess");
        return "guess again";
      }
      await db.patch(currentRound._id, {
        stage: "reveal",
        stageStart: Date.now(),
        stageEnd: Date.now() + PublicRevealMs,
      });
      return "->reveal";
    }
    if (currentRound.stage !== "reveal") {
      throw new Error(`Invalid stage: ${currentRound.stage}`);
    }
    const round = await db
      .query("rounds")
      .withIndex("public_game", (q) =>
        q.eq("publicRound", false).eq("stage", "reveal")
      )
      .order("asc")
      .first();
    if (!round) throw new Error("No public round.");
    await db.patch(round._id, { lastUsed: Date.now() });
    for (const option of round.options) {
      option.likes = [];
      option.votes = [];
    }
    round.stage = "guess";
    round.stageStart = Date.now();
    round.stageEnd = Date.now() + PublicGuessMs;
    round.publicRound = true;
    const { _id, _creationTime, ...rest } = round;
    const roundId = await db.insert("rounds", rest);
    await db.patch(publicGame._id, { roundId });
    scheduler.runAfter(PublicGuessMs, "publicGame:progress", "guess");
    return "->guess";
  }
);
