import { query } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./utils";

/**
 * Check if current user has active access to a restaurant
 * Returns null if no access, or { role, isActive } if they do
 */
export const checkMyAccess = query({
    args: {
        restaurantId: v.id("restaurants"),
    },
    handler: async (ctx, args) => {
        try {
            const userId = await getUserId(ctx);
            const restaurant = await ctx.db.get(args.restaurantId);

            if (!restaurant) {
                return null;
            }

            // Check if owner (owners can't be revoked)
            if (restaurant.ownerId === userId) {
                return {
                    role: "owner" as const,
                    isActive: true,
                    isOwner: true
                };
            }

            // Check staff table
            const staff = await ctx.db
                .query("staff")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .filter((q) => q.eq(q.field("restaurantId"), args.restaurantId))
                .first();

            if (!staff) {
                return null; // Not staff, not owner
            }

            return {
                role: staff.role,
                isActive: staff.isActive,
                isOwner: false,
            };
        } catch (error) {
            // User not logged in
            return null;
        }
    },
});
