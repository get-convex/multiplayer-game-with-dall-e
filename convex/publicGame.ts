import { MaxOptions, newRound } from "./round";
import { mutation, query } from "./_generated/server";

export const get = query(async ({ db }) => {
  const publicGame = await db.query("publicGame").unique();
  if (!publicGame) throw new Error("No public game currently.");
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
  // TODO
  const submission = await db.query("submissions").first();
  if (!submission) throw new Error("No submission for the round");
  const roundId = await db.insert(
    "rounds",
    newRound(submission.authorId, submission?._id, MaxOptions)
  );
  if (publicGame) {
    await db.patch(publicGame._id, { roundId });
  } else {
    await db.insert("publicGame", { roundId });
  }
});
