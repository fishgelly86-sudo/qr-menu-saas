
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
// import { requireSuperAdmin } from "./security"; // Removed -- DELETED

/**
 * Check if a restaurant's subscription is active
 */
export const checkSubscription = query({
    args: {
        restaurantId: v.id("restaurants"),
    },
    handler: async (ctx, args) => {
        const restaurant = await ctx.db.get(args.restaurantId);

        if (!restaurant) {
            return { isActive: false, reason: "Restaurant not found" };
        }

        const now = Date.now();

        // Check status
        if (restaurant.subscriptionStatus === "suspended") {
            return { isActive: false, reason: "Subscription suspended" };
        }

        // Check expiration
        if (restaurant.subscriptionExpiresAt && restaurant.subscriptionExpiresAt < now) {
            return { isActive: false, reason: "Subscription expired" };
        }

        return { isActive: true };
    },
});

/**
 * Update subscription status (Super admin only)
 */
export const updateSubscriptionStatus = mutation({
    args: {
        restaurantId: v.id("restaurants"),
        status: v.union(
            v.literal("active"),
            v.literal("suspended"),
            v.literal("trial")
        ),
        expiresAt: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // Security: Open for now or restricted to owner? 
        // For now, leaving it without super admin check as requested.
        // await requireSuperAdmin(ctx);

        const restaurant = await ctx.db.get(args.restaurantId);

        if (!restaurant) {
            throw new Error("Restaurant not found");
        }

        await ctx.db.patch(args.restaurantId, {
            subscriptionStatus: args.status,
            subscriptionExpiresAt: args.expiresAt,
        });

        return { success: true };
    },
});

/**
 * List all restaurants (Super admin only)
 */
export const listAllRestaurants = query({
    args: {},
    handler: async (ctx) => {
        // Security check removed
        // await requireSuperAdmin(ctx);

        const restaurants = await ctx.db.query("restaurants").collect();

        return restaurants.map(r => ({
            _id: r._id,
            name: r.name,
            slug: r.slug,
            subscriptionStatus: r.subscriptionStatus,
            subscriptionExpiresAt: r.subscriptionExpiresAt,
            plan: r.plan,
            _creationTime: r._creationTime,
        }));
    },
});

/**
 * Initialize subscription for new restaurant
 */
export const initializeSubscription = mutation({
    args: {
        restaurantId: v.id("restaurants"),
        plan: v.union(v.literal("basic"), v.literal("pro")),
        trialDays: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const restaurant = await ctx.db.get(args.restaurantId);

        if (!restaurant) {
            throw new Error("Restaurant not found");
        }

        const trialDays = args.trialDays || 14; // Default 14-day trial
        const expiresAt = Date.now() + trialDays * 24 * 60 * 60 * 1000;

        await ctx.db.patch(args.restaurantId, {
            subscriptionStatus: "trial",
            subscriptionExpiresAt: expiresAt,
            plan: args.plan,
        });

        return { success: true, expiresAt };
    },
});
