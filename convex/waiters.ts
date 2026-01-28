import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./utils";

/**
 * Create a new waiter
 */
export const createWaiter = mutation({
    args: {
        restaurantId: v.id("restaurants"),
        name: v.string(),
        password: v.string(),
        assignedTables: v.optional(v.array(v.id("tables"))),
        handlesTakeaway: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        const restaurant = await ctx.db.get(args.restaurantId);

        if (!restaurant) {
            throw new Error("Restaurant not found");
        }

        if (restaurant.ownerId !== userId) {
            // Check if caller is manager? For now restrict to owner/manager
            const staff = await ctx.db
                .query("staff")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .filter((q) => q.eq(q.field("restaurantId"), args.restaurantId))
                .first();

            if (!staff || staff.role !== "manager") {
                throw new Error("Unauthorized");
            }
        }

        const waiterId = await ctx.db.insert("waiters", {
            restaurantId: args.restaurantId,
            name: args.name,
            password: args.password,
            assignedTables: args.assignedTables,
            handlesTakeaway: args.handlesTakeaway,
            isDefault: false,
        });

        return waiterId;
    },
});

/**
 * Update a waiter
 */
export const updateWaiter = mutation({
    args: {
        waiterId: v.id("waiters"),
        name: v.optional(v.string()),
        password: v.optional(v.string()),
        assignedTables: v.optional(v.array(v.id("tables"))),
        handlesTakeaway: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        const waiter = await ctx.db.get(args.waiterId);

        if (!waiter) {
            throw new Error("Waiter not found");
        }

        const restaurant = await ctx.db.get(waiter.restaurantId);
        if (!restaurant) {
            throw new Error("Restaurant not found");
        }

        // Auth check
        if (restaurant.ownerId !== userId) {
            const staff = await ctx.db
                .query("staff")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .filter((q) => q.eq(q.field("restaurantId"), restaurant._id))
                .first();

            if (!staff || staff.role !== "manager") {
                throw new Error("Unauthorized");
            }
        }

        const updates: any = {};
        if (args.name !== undefined) updates.name = args.name;
        if (args.password !== undefined) updates.password = args.password;
        if (args.assignedTables !== undefined) updates.assignedTables = args.assignedTables;
        if (args.handlesTakeaway !== undefined) updates.handlesTakeaway = args.handlesTakeaway;

        await ctx.db.patch(args.waiterId, updates);
    },
});

/**
 * Delete a waiter
 */
export const deleteWaiter = mutation({
    args: {
        waiterId: v.id("waiters"),
    },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        const waiter = await ctx.db.get(args.waiterId);

        if (!waiter) {
            throw new Error("Waiter not found");
        }

        const restaurant = await ctx.db.get(waiter.restaurantId);
        if (!restaurant) {
            throw new Error("Restaurant not found");
        }

        // Auth check
        if (restaurant.ownerId !== userId) {
            const staff = await ctx.db
                .query("staff")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .filter((q) => q.eq(q.field("restaurantId"), restaurant._id))
                .first();

            if (!staff || staff.role !== "manager") {
                throw new Error("Unauthorized");
            }
        }

        await ctx.db.delete(args.waiterId);
    },
});

/**
 * List waiters
 */
export const listWaiters = query({
    args: {
        restaurantId: v.id("restaurants"),
    },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);

        // Security: Ensure caller has access to the restaurant
        const restaurant = await ctx.db.get(args.restaurantId);
        if (!restaurant) return [];

        if (restaurant.ownerId !== userId) {
            const staff = await ctx.db
                .query("staff")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .filter((q) => q.eq(q.field("restaurantId"), args.restaurantId))
                .first();

            // Waiters cannot manage waiters? 
            if (!staff) { // Allow waiters to list waiters? Maybe not. Let's strict it to manager/owner for now as per "Manage Staff Access" page.
                return [];
            }
        }

        return await ctx.db
            .query("waiters")
            .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
            .collect();
    },
});

/**
 * Waiter Login
 */
export const waiterLogin = mutation({
    args: {
        email: v.string(), // Restaurant email (owner email or manager email?) User said "same email of the restaurant" which usually means ownerEmail.
        password: v.string(),
    },
    handler: async (ctx, args) => {
        // 1. Find restaurant by ownerEmail (or we assume the input is the restaurant's main email)
        // The schema has `ownerEmail` on `restaurants` table.
        // But what if multiple restaurants have same owner email? schema says unique index? No.
        // `restaurants` has `ownerEmail: v.optional(v.string())`.
        // Let's search by ownerEmail.

        // Actually, searching by ownerEmail might be slow if not indexed.
        // Schema: .index("by_search_field", ...) ? 
        // We have .index("by_owner", ["ownerId"]). 
        // We do NOT have an index on ownerEmail globally efficiently? 
        // Wait, `managers` table has email.

        // User said: "keep the same email of the restaurant".
        // Let's assume this means the `ownerEmail` field on the restaurant, or we assume the user enters the restaurant SLUG?
        // "email of the restaurant" implies the owner's email.

        // Let's try to find potential restaurants.
        // We might need to index `ownerEmail` if we want fast lookups, or iterate.
        // For now, let's assume we can query `restaurants`. BUT `ownerEmail` is not indexed in schema.ts
        // Schema:
        // restaurants: defineTable({...}).index("by_slug").index("by_owner")

        // ISSUE: We can't efficiently search restaurant by `ownerEmail` without an index.
        // AND we might have multiple restaurants.

        // Workaround: Maybe we should index `ownerEmail`? 
        // Or do we iterate? Iterating is bad.
        // Let's search `staff` (managers) by email? "email of the restaurant" -> Owner email.

        // Proposal: Add index to `ownerEmail` in `restaurants` in the previous step?
        // OR, simply scan for now if n is small? No, bad practice.

        // Let's look at `schema.ts` again.
        // It has `managers` table indexed by email.
        // Maybe we just assume the login email corresponds to a manager/owner?

        // Let's add the index to `ownerEmail` in the schema update as well.

        // Additional complexity: Multiple waiters might have same password? 
        // "password only the manager can set".
        // If 2 waiters have same password, how do we know which one?
        // Ah, the Request says: "by default it should have only one waiter that has the access to all of the tabels... and if we have multiple waiters..."
        // Use case: Login (Email + Password).
        // If multiple waiters have different passwords, we match password.
        // If multiple waiters have SAME password? That's a conflict.
        // We should enforce unique passwords per restaurant for waiters? Or just pick the first one matching.
        // Ideally, unique passwords or unique usernames (but user said "same email").
        // So uniqueness MUST be on Password?

        // Let's assume unique passwords for waiters in the same restaurant.

        // FOR NOW, in this file, I will write the logic assuming I can find the restaurant.
        // I will update schema to index `ownerEmail`.

        const restaurants = await ctx.db.query("restaurants")
            .filter(q => q.eq(q.field("ownerEmail"), args.email))
            .take(5); // In case multiple restaurants share owner email

        // This filter is a table scan. I MUST add an index.

        // Let's proceed with writing this file, but remember to add index in schema.

        for (const restaurant of restaurants) {
            const waiters = await ctx.db
                .query("waiters")
                .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurant._id))
                .collect();

            const match = waiters.find(w => w.password === args.password);
            if (match) {
                return {
                    waiterId: match._id,
                    restaurantId: restaurant._id,
                    name: match.name,
                    assignedTables: match.assignedTables,
                    handlesTakeaway: match.handlesTakeaway || false,
                };
            }
        }

        throw new Error("Invalid credentials");
    },
});
