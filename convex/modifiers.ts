import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getModifiersByRestaurant = query({
    args: { restaurantId: v.id("restaurants") },
    handler: async (ctx, args) => {
        const modifiers = await ctx.db
            .query("modifiers")
            .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
            .collect();

        return modifiers.filter(m => !m.deletedAt);
    },
});

export const createModifier = mutation({
    args: {
        restaurantId: v.id("restaurants"),
        name: v.string(),
        name_ar: v.optional(v.string()),
        price: v.number(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("modifiers", args);
    },
});

export const updateModifier = mutation({
    args: {
        modifierId: v.id("modifiers"),
        name: v.optional(v.string()),
        name_ar: v.optional(v.string()),
        price: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { modifierId, ...updates } = args;
        await ctx.db.patch(modifierId, updates);
    },
});

export const deleteModifier = mutation({
    args: { modifierId: v.id("modifiers") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.modifierId, { deletedAt: Date.now() });
    },
});
