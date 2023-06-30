import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const cron = cronJobs();

cron.interval(
  "public game progress",
  { seconds: 10 },
  internal.publicGame.progress,
  {
    fromStage: "reveal",
  }
);

export default cron;
