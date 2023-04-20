import { cronJobs } from "./_generated/server";

const cron = cronJobs();

cron.interval("public game progress", { seconds: 10 }, "publicGame:progress", {
  fromStage: "reveal",
});

export default cron;
