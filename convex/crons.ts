import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
    "clear-dashboard-daily",
    { hourUTC: 7, minuteUTC: 0 },
    internal.orders.internalArchiveAllCompletedOrders
);

crons.daily(
    "cleanup-expired-sessions-daily",
    { hourUTC: 3, minuteUTC: 0 },
    internal.sessions.internalCleanupExpiredSessions
);

export default crons;
