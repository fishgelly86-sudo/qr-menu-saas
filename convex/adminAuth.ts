import { v } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { compare } from "bcryptjs";

/**
 * Fetch restaurant auth details (Internal, so hash isn't exposed publicly by default)
 */
export const getRestaurantCredentials = internalQuery({
    args: { identifier: v.string() }, // slug or email
    handler: async (ctx, args) => {
        // Try by slug
        let restaurant = await ctx.db
            .query("restaurants")
            .withIndex("by_slug", (q) => q.eq("slug", args.identifier))
            .unique();

        if (!restaurant) {
            return null;
        }

        return {
            _id: restaurant._id,
            slug: restaurant.slug,
            passwordHash: restaurant.passwordHash,
        };
    },
});

/**
 * Action to verify login credentials securely on the server
 */
export const login = action({
    args: {
        identifier: v.string(),
        password: v.string(),
    },
    handler: async (ctx, args) => {
        // 1. Fetch credentials via internal query
        const credentials = await ctx.runQuery(internal.adminAuth.getRestaurantCredentials, {
            identifier: args.identifier,
        }) as any;

        if (!credentials || !credentials.passwordHash) {
            throw new Error("Invalid credentials");
        }

        // 2. Compare password (Hash check first, then plain text fallback)
        let isValid = await compare(args.password, credentials.passwordHash);

        if (!isValid) {
            // Fallback for plain text (for old dev data)
            isValid = args.password === credentials.passwordHash;
        }

        if (!isValid) {
            throw new Error("Invalid credentials");
        }

        // 3. Return success
        return {
            restaurantId: credentials._id,
            slug: credentials.slug,
        };
    },
});
