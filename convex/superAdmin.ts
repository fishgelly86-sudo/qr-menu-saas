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

// Helper to check secret
function checkAdminKey(providedKey: string) {
    const expectedSecret = process.env.SUPER_ADMIN_SECRET;
    if (!expectedSecret) throw new Error("Super admin secret not configured");
    if (providedKey !== expectedSecret) throw new Error("Invalid super admin secret key");
}

export const createRestaurant = mutation({
    args: {
        name: v.string(),
        slug: v.string(),
        ownerEmail: v.string(),
        passwordHash: v.string(),
        secretKey: v.string(),
    },
    handler: async (ctx, args) => {
        checkAdminKey(args.secretKey);

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
        secretKey: v.string(),
    },
    handler: async (ctx, args) => {
        checkAdminKey(args.secretKey);

        const restaurant = await ctx.db.get(args.restaurantId);
        if (!restaurant) {
            throw new Error("Restaurant not found");
        }

        await ctx.db.patch(args.restaurantId, {
            passwordHash: args.passwordHash,
            passwordChangedAt: Date.now(),
        });

        return { success: true };
    },
});

export const generateImpersonationToken = mutation({
    args: {
        restaurantId: v.id("restaurants"),
        secretKey: v.string(),
    },
    handler: async (ctx, args) => {
        checkAdminKey(args.secretKey);

        // 2. Fetch Restaurant
        const restaurant = await ctx.db.get(args.restaurantId);
        if (!restaurant) {
            throw new Error("Restaurant not found");
        }

        // 3. Return Session Data
        return {
            success: true,
            restaurantId: restaurant._id,
            slug: restaurant.slug,
            name: restaurant.name,
            impersonatedAt: Date.now(),
        };
    },
});

export const updateRestaurantDetails = mutation({
    args: {
        restaurantId: v.id("restaurants"),
        name: v.optional(v.string()),
        slug: v.optional(v.string()),
        plan: v.optional(v.string()),
        subscriptionStatus: v.optional(v.union(v.literal("active"), v.literal("suspended"), v.literal("trial"))),
        subscriptionExpiresAt: v.optional(v.number()),
        secretKey: v.string(),
    },
    handler: async (ctx, args) => {
        checkAdminKey(args.secretKey);

        const updates: any = {};
        if (args.name !== undefined) updates.name = args.name;
        if (args.plan !== undefined) updates.plan = args.plan;
        if (args.subscriptionStatus !== undefined) updates.subscriptionStatus = args.subscriptionStatus;
        if (args.subscriptionExpiresAt !== undefined) updates.subscriptionExpiresAt = args.subscriptionExpiresAt;

        if (args.slug !== undefined) {
            // Check for uniqueness
            const existing = await ctx.db
                .query("restaurants")
                .withIndex("by_slug", (q) => q.eq("slug", args.slug!))
                .first();

            if (existing && existing._id !== args.restaurantId) {
                throw new Error(`Restaurant with slug "${args.slug}" already exists`);
            }
            updates.slug = args.slug;
        }

        await ctx.db.patch(args.restaurantId, updates);
    },
});

export const deleteRestaurant = mutation({
    args: {
        restaurantId: v.id("restaurants"),
        secretKey: v.string(),
    },
    handler: async (ctx, args) => {
        checkAdminKey(args.secretKey);

        await ctx.db.delete(args.restaurantId);
    },
});
