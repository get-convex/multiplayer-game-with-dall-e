import { MaxOptions, newRound } from "./round";
import { mutation, query } from "./_generated/server";

export const get = query(async ({ db }) => {
  const publicGame = await db.query("publicGame").unique();
  if (!publicGame) {
    console.warn("No public game currently.");
    return null;
  }
  return publicGame.roundId;
});

export const progress = mutation(async ({ db }) => {
  const publicGame = await db.query("publicGame").unique();
  if (publicGame) {
    const round = await db.get(publicGame.roundId);
    if (!round) throw new Error("Round not found");
    if (round.stage !== "reveal" || round.stageEnd > Date.now()) {
      throw new Error("Previous round not over.");
    }
  }
  const submission = await db
    .query("submissions")
    .withIndex("status_by_unused", (q) => q.eq("status", "saved"))
    .first();
  if (!submission) throw new Error("No submission for the round");
  if (submission.status !== "saved") throw new Error("Bad submission");
  await db.patch(submission._id, { lastUsed: Date.now() });
  const roundId = await db.insert(
    "rounds",
    newRound(
      submission.authorId,
      submission.imageStorageId,
      submission.prompt,
      MaxOptions
    )
  );
  if (publicGame) {
    await db.patch(publicGame._id, { roundId });
  } else {
    await db.insert("publicGame", { roundId });
  }
});
