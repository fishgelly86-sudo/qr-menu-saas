import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const claimRestaurant = mutation({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        // Kept for signature compatibility if needed, but logic is in claimBurgerBistro
        return "Use claimBurgerBistro";
    }
});

export const claimBurgerBistro = mutation({
    args: {},
    handler: async (ctx) => {
        // 1. Find the User by Email (Developer Override)
        // Convex Auth stores users in "users" table. Schema depends on config but email is usually there.
        const user = await ctx.db
            .query("users")
            .filter(q => q.eq(q.field("email"), "manager@burgerbistro.com"))
            .first();

        if (!user) throw new Error("User manager@burgerbistro.com not found. Did you run the setup page?");

        const userId = user._id;

        const restaurant = await ctx.db
            .query("restaurants")
            .withIndex("by_slug", (q) => q.eq("slug", "burger-bistro"))
            .unique();

        if (!restaurant) throw new Error("Restaurant not found");

        // Update owner to current user
        await ctx.db.patch(restaurant._id, {
            ownerId: userId
        });

        // Also ensure they are in the staff list as owner
        const existingStaff = await ctx.db
            .query("staff")
            .withIndex("by_user", q => q.eq("userId", userId))
            .filter(q => q.eq(q.field("restaurantId"), restaurant._id))
            .first();

        if (existingStaff) {
            await ctx.db.patch(existingStaff._id, { role: "owner" });
        } else {
            await ctx.db.insert("staff", {
                restaurantId: restaurant._id,
                userId: userId,
                role: "owner",
                email: "manager@burgerbistro.com",
                name: "Manager",
                isActive: true,
            });
        }

        return `Ownership claimed for burger-bistro by user ${userId}`;
    },
});
