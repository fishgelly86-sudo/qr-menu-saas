import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRestaurantManager } from "./utils";

export const setManagerStatus = mutation({
    args: {
        restaurantId: v.id("restaurants"),
        email: v.optional(v.string()), // Optional now for heartbeat updates without auth context
        isOnline: v.boolean(),
    },
    handler: async (ctx, args) => {
        // Only require that user is logged in, not that they're already a manager
        // This mutation is used to SET status, so we can't require manager status first
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthorized: Please log in.");
        }

        const now = Date.now();
        // 2 hour session
        const sessionExpiresAt = now + 2 * 60 * 60 * 1000;

        // If email provided, finding by email, otherwise find any active manager for this restaurant or create a generic one?
        // Heartbeat logic: we want to update the "active" manager record.
        // For simplicity, if no email, we look for the most recent active manager for this restaurant to update.

        let existing = null;
        const userEmail = identity.email || identity.tokenIdentifier || args.email;

        if (userEmail) {
            existing = await ctx.db
                .query("managers")
                .withIndex("by_email", (q) => q.eq("email", userEmail))
                .filter((q) => q.eq(q.field("restaurantId"), args.restaurantId))
                .first();
        } else if (args.email) {
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
            // Create a new manager record using the authenticated user's email
            await ctx.db.insert("managers", {
                restaurantId: args.restaurantId,
                email: userEmail || "unknown@user.com",
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
        // 1. Primary Check: Restaurant "Accepting Orders" Toggle
        const restaurant = await ctx.db.get(args.restaurantId);
        if (restaurant && restaurant.isAcceptingOrders === true) {
            return { isOnline: true };
        }
        if (restaurant && restaurant.isAcceptingOrders === false) {
            return { isOnline: false, reason: "Restaurant is currently closed." };
        }

        // 2. Fallback: Manager Heartbeat (Legacy/Auto-mode)
        const now = Date.now();
        const managers = await ctx.db
            .query("managers")
            .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
            .collect();

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
