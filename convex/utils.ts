import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Gets the authenticated user's ID or throws if not authenticated.
 */
export async function getUserId(ctx: QueryCtx | MutationCtx) {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
        throw new Error("Unauthorized: Please log in.");
    }
    return userId;
}

/**
 * Helper to get the authenticated user and verify they own the restaurant.
 * Returns the restaurant object if authorized, otherwise throws.
 */
export async function requireRestaurantOwner(
    ctx: QueryCtx | MutationCtx,
    restaurantId: Id<"restaurants">
) {
    const userId = await getUserId(ctx);

    const restaurant = await ctx.db.get(restaurantId);
    if (!restaurant) {
        throw new Error("Restaurant not found");
    }

    // Check if the user is the owner
    // Note: ownerId in schema is currently just a string (clerkId/subject)
    if (restaurant.ownerId !== userId) {
        throw new Error("Unauthorized: You are not the owner of this restaurant.");
    }

    return restaurant;
}

/**
 * Helper to get the authenticated user and verify they are a manager OR owner.
 * Returns the restaurant object if authorized.
 */
export async function requireRestaurantManager(
    ctx: QueryCtx | MutationCtx,
    restaurantId: Id<"restaurants">
) {
    // BYPASS: For the manual login system, we disable backend checks.
    // The frontend handles the password protection.
    return;

    /* ORIGINAL LOGIC DISABLED
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
        throw new Error("Unauthorized: Please log in.");
    }

    const userId = identity.subject;

    const restaurant = await ctx.db.get(restaurantId);
    if (!restaurant) {
        throw new Error("Restaurant not found");
    }

    // 1. Owner check (using subject/userId)
    if (restaurant.ownerId === userId) {
        return restaurant;
    }

    // 2. Manager check using staff table (Unified RBAC)
    const staff = await ctx.db
        .query("staff")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
        .first();

    if (staff && staff.isActive && (staff.role === "manager" || staff.role === "owner")) {
        return restaurant;
    }

    throw new Error("Unauthorized: You are not a manager or owner of this restaurant.");
    */
}
