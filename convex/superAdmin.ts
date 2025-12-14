import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Super Admin Functions
 * These functions allow a super admin to manage restaurants.
 * TODO: Add proper authorization checks (e.g., check for super admin role)
 */

export const listRestaurants = query({
    args: {},
    handler: async (ctx) => {
        // TODO: Add super admin authorization check
        // For now, return all restaurants
        return await ctx.db.query("restaurants").collect();
    },
});

export const createRestaurant = mutation({
    args: {
        name: v.string(),
        slug: v.string(),
        ownerEmail: v.string(),
        passwordHash: v.string(),
    },
    handler: async (ctx, args) => {
        // TODO: Add super admin authorization check

        // Check if slug already exists
        const existing = await ctx.db
            .query("restaurants")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();

        if (existing) {
            throw new Error(`Restaurant with slug "${args.slug}" already exists`);
        }

        // Create the restaurant
        const restaurantId = await ctx.db.insert("restaurants", {
            name: args.name,
            slug: args.slug,
            ownerId: "pending", // Will be set when owner claims it
            currency: "DA",
            ownerEmail: args.ownerEmail,
            passwordHash: args.passwordHash,
            settings: {
                allowSplitBill: true,
                autoUpsell: true,
            },
            subscriptionStatus: "trial",
            subscriptionExpiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000, // 14 days trial
            plan: "basic",
            isAcceptingOrders: true,
        });

        return restaurantId;
    },
});

export const updateRestaurantPassword = mutation({
    args: {
        restaurantId: v.id("restaurants"),
        passwordHash: v.string(),
    },
    handler: async (ctx, args) => {
        // TODO: Add super admin authorization check

        const restaurant = await ctx.db.get(args.restaurantId);
        if (!restaurant) {
            throw new Error("Restaurant not found");
        }

        await ctx.db.patch(args.restaurantId, {
            passwordHash: args.passwordHash,
        });

        return { success: true };
    },
});
