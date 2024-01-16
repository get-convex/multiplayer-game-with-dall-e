import { v } from "convex/values";
import { internal } from "./_generated/api";
import { myInternalMutation, myQuery } from "./lib/myFunctions";

export const get = myQuery({
  handler: async (ctx) => {
    const publicGame = await ctx.db.query("publicGame").unique();
    if (!publicGame) {
      console.warn("No public game currently.");
      return null;
    }
    return publicGame.roundId;
  },
});

const PublicGuessMs = 15000;
const PublicRevealMs = 10000;

export const progress = myInternalMutation({
  args: { fromStage: v.union(v.literal("guess"), v.literal("reveal")) },
  handler: async (ctx, { fromStage }) => {
    const publicGame = await ctx.db.query("publicGame").unique();
    if (!publicGame) throw new Error("No public game");
    const currentRound = await ctx.db.get(publicGame.roundId);
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
        await ctx.scheduler.runAfter(
          PublicGuessMs,
          internal.publicGame.progress,
          {
            fromStage: "guess",
          }
        );
        return "guess again";
      }
      await ctx.db.patch(currentRound._id, {
        stage: "reveal",
        stageStart: Date.now(),
        stageEnd: Date.now() + PublicRevealMs,
      });
      return "->reveal";
    }
    if (currentRound.stage !== "reveal") {
      throw new Error(`Invalid stage: ${currentRound.stage}`);
    }
    const round = await ctx.db
      .query("rounds")
      .withIndex("public_game", (q) =>
        q.eq("publicRound", false).eq("stage", "reveal")
      )
      .order("asc")
      .first();
    if (!round) throw new Error("No public round.");
    await ctx.db.patch(round._id, { lastUsed: Date.now() });
    for (const option of round.options) {
      option.likes = [];
      option.votes = [];
    }
    round.stage = "guess";
    round.stageStart = Date.now();
    round.stageEnd = Date.now() + PublicGuessMs;
    round.publicRound = true;
    const { _id, _creationTime, ...rest } = round;
    const roundId = await ctx.db.insert("rounds", rest);
    await ctx.db.patch(publicGame._id, { roundId });
    await ctx.scheduler.runAfter(PublicGuessMs, internal.publicGame.progress, {
      fromStage: "guess",
    });
    return "->guess";
  },
});
