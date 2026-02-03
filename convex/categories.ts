import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getCategoriesByRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_restaurant_and_rank", (q) => q.eq("restaurantId", args.restaurantId))
      .order("asc")
      .collect();

    return categories.filter(cat => !cat.deletedAt);
  },
});

export const createCategory = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    name: v.string(),
    name_ar: v.optional(v.string()),
    icon: v.optional(v.string()),
    rank: v.number(),
    stationId: v.optional(v.id("stations")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("categories", args);
  },
});

export const updateCategory = mutation({
  args: {
    categoryId: v.id("categories"),
    name: v.optional(v.string()),
    name_ar: v.optional(v.string()),
    icon: v.optional(v.string()),
    stationId: v.optional(v.id("stations")),
  },
  handler: async (ctx, args) => {
    const { categoryId, ...updates } = args;
    await ctx.db.patch(categoryId, updates);
    return categoryId;
  },
});

export const updateCategoryRank = mutation({
  args: {
    categoryId: v.id("categories"),
    rank: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.categoryId, { rank: args.rank });
    return args.categoryId;
  },
});

export const deleteCategory = mutation({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.categoryId, { deletedAt: Date.now() });
  },
});

export const undoDeleteCategory = mutation({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.categoryId, { deletedAt: undefined });
  },
});
