import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const cron = cronJobs();

cron.interval(
  "public game progress",
  { seconds: 10 },
  api.publicGame.progress,
  {
    fromStage: "reveal",
  }
);

export default cron;
