import { query } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./utils";

/**
 * List all staff for a restaurant, including the owner
 * Simplified version without strict authorization
 */
export const listAllStaffWithOwner = query({
    args: {
        restaurantId: v.id("restaurants"),
    },
    handler: async (ctx, args) => {
        // Just require user to be logged in
        const userId = await getUserId(ctx);
        const restaurant = await ctx.db.get(args.restaurantId);

        if (!restaurant) {
            throw new Error("Restaurant not found");
        }

        // Get all staff from staff table
        const allStaff = await ctx.db
            .query("staff")
            .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
            .collect();

        const isOwner = restaurant.ownerId === userId;

        if (!isOwner) {
            // Check if user is active staff (manager or owner role in staff table)
            const userStaff = await ctx.db
                .query("staff")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .filter((q) => q.eq(q.field("restaurantId"), args.restaurantId))
                .first();

            if (!userStaff || !userStaff.isActive || userStaff.role === "waiter") {
                throw new Error("Unauthorized: Only owners and managers can view staff list");
            }
        }

        // Check if owner is also in staff table
        const ownerStaff = allStaff.find(s => s.userId === restaurant.ownerId);

        // Combine owner + staff
        const staffList = [
            // Add owner first
            {
                _id: restaurant._id, // Use restaurant ID as placeholder
                userId: restaurant.ownerId,
                restaurantId: args.restaurantId,
                role: "owner" as const,
                isActive: true,
                email: ownerStaff?.email || "owner@restaurant.com",
                name: ownerStaff?.name || "Restaurant Owner",
                _creationTime: restaurant._creationTime,
            },
            // Then add all staff members (excluding owner if they're in staff table)
            ...allStaff.filter(s => s.userId !== restaurant.ownerId),
        ];

        return staffList;
    },
});
