import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
    "cleanup-deleted-items",
    { hourUTC: 0, minuteUTC: 0 },
    internal.cleanup.deleteOldSoftDeletedItems
);

export default crons;
