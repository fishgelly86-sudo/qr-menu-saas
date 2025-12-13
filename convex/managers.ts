import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const setManagerStatus = mutation({
    args: {
        restaurantId: v.id("restaurants"),
        email: v.optional(v.string()), // Optional now for heartbeat updates without auth context
        isOnline: v.boolean(),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        // 2 hour session
        const sessionExpiresAt = now + 2 * 60 * 60 * 1000;

        // If email provided, finding by email, otherwise find any active manager for this restaurant or create a generic one?
        // Heartbeat logic: we want to update the "active" manager record.
        // For simplicity, if no email, we look for the most recent active manager for this restaurant to update.

        let existing = null;
        if (args.email) {
            existing = await ctx.db
                .query("managers")
                .withIndex("by_email", (q) => q.eq("email", args.email!))
                .filter((q) => q.eq(q.field("restaurantId"), args.restaurantId))
                .first();
        } else {
            // Find the most recently updated manager for this restaurant
            const managers = await ctx.db
                .query("managers")
                .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
                .collect();
            // Sort in memory as we don't have index on lastSeenAt yet, or use what we have
            if (managers.length > 0) {
                existing = managers.sort((a, b) => b.lastSeenAt - a.lastSeenAt)[0];
            }
        }

        if (existing) {
            await ctx.db.patch(existing._id, {
                isOnline: args.isOnline,
                lastSeenAt: now,
                lastHeartbeat: now,
                sessionExpiresAt: args.isOnline ? sessionExpiresAt : existing.sessionExpiresAt,
            });
        } else {
            // Create a new manager record (default/fallback if no email provided)
            await ctx.db.insert("managers", {
                restaurantId: args.restaurantId,
                email: args.email || "default@admin.com", // Fallback email
                isOnline: args.isOnline,
                lastSeenAt: now,
                lastHeartbeat: now,
                sessionExpiresAt: sessionExpiresAt,
            });
        }
    },
});

export const isManagerOnline = query({
    args: {
        restaurantId: v.id("restaurants"),
    },
    handler: async (ctx, args) => {
        const now = Date.now();

        // TimeZone Fix: Algeria (UTC+1)
        const algeriaTime = new Date(now + 1 * 60 * 60 * 1000); // Adding 1 hour in ms
        const hour = algeriaTime.getUTCHours(); // Use getUTCHours because we added the offset manually to the timestamp to shift it

        // Rule: Open between 8 AM and 2 AM (next day) ?? Or simple 8 AM start check?
        // User mentioned "8 AM rule".
        // Let's assume strict 8 AM to EOD.
        // If hour < 8, strictly closed? Or just checking manager presence?
        // User's previous request implies they want manager presence to override or be the source of truth.
        // "Manager status check returns false even though admin is actively working" implies we trust the heartbeat.

        // Check if ANY manager for this restaurant has a recent heartbeat (last 60s)
        const managers = await ctx.db
            .query("managers")
            .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
            .collect();

        // Active if online AND (heartbeat within last 60s OR session valid)
        // Heartbeat is more precise for "actively working".
        const onlineManager = managers.find(
            (m) => m.isOnline && (
                (m.lastHeartbeat && (now - m.lastHeartbeat) < 60000) ||
                m.sessionExpiresAt > now
            )
        );

        if (onlineManager) {
            return { isOnline: true };
        }

        return { isOnline: false, reason: "No manager active or session expired" };
    },
});
