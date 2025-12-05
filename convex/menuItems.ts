import { query, mutation, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const markItemAvailability = mutation({
  args: {
    itemId: v.id("menuItems"),
    isAvailable: v.boolean(),
  },
  handler: async (ctx, args) => {
    const menuItem = await ctx.db.get(args.itemId);
    if (!menuItem) {
      throw new Error("Menu item not found");
    }

    await ctx.db.patch(args.itemId, { isAvailable: args.isAvailable });
    return args.itemId;
  },
});

export const getMenuItemsByCategory = query({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("menuItems")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .collect();

    return items.filter(item => !item.deletedAt);
  },
});

export const getMenuItemsByRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("menuItems")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();

    return items.filter(item => !item.deletedAt);
  },
});

// ... (existing mutations)

export const deleteMenuItem = mutation({
  args: { itemId: v.id("menuItems") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.itemId, { deletedAt: Date.now() });
  },
});

export const undoDeleteMenuItem = mutation({
  args: { itemId: v.id("menuItems") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.itemId, { deletedAt: undefined });
  },
});

// Internal mutation to save the translated description
export const internalUpdateMenuItemTranslation = internalMutation({
  args: {
    itemId: v.id("menuItems"),
    description_ar: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.itemId, { description_ar: args.description_ar });
  },
});

// Mock AI Action to translate text
export const generateArabicTranslation = internalAction({
  args: {
    itemId: v.id("menuItems"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    // In a real app, call OpenAI or Google Translate API here
    // For now, we'll use a mock translation that makes it obvious it worked
    const mockTranslation = `(مترجم تلقائياً) ${args.text}`;

    await ctx.runMutation(internal.menuItems.internalUpdateMenuItemTranslation, {
      itemId: args.itemId,
      description_ar: mockTranslation,
    });
  },
});

export const createMenuItem = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    categoryId: v.id("categories"),
    name: v.string(),
    description: v.string(),
    description_ar: v.optional(v.string()),
    price: v.number(),
    imageUrl: v.optional(v.string()),
    isAvailable: v.boolean(),
    tags: v.array(v.string()),
    relatedModifiers: v.optional(v.array(v.id("modifiers"))),
  },
  handler: async (ctx, args) => {
    const { description_ar, ...rest } = args;
    const itemId = await ctx.db.insert("menuItems", { ...rest, description_ar });

    // If description provided but no Arabic translation, trigger auto-translation
    if (args.description && !description_ar) {
      await ctx.scheduler.runAfter(0, internal.menuItems.generateArabicTranslation, {
        itemId,
        text: args.description,
      });
    }

    return itemId;
  },
});

export const updateMenuItem = mutation({
  args: {
    itemId: v.id("menuItems"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    description_ar: v.optional(v.string()),
    price: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    isAvailable: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    relatedModifiers: v.optional(v.array(v.id("modifiers"))),
  },
  handler: async (ctx, args) => {
    const { itemId, ...updates } = args;

    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(cleanUpdates).length === 0) {
      throw new Error("No updates provided");
    }

    await ctx.db.patch(itemId, cleanUpdates);

    // If description was updated but description_ar was NOT provided, trigger translation
    if (updates.description && !updates.description_ar) {
      await ctx.scheduler.runAfter(0, internal.menuItems.generateArabicTranslation, {
        itemId,
        text: updates.description,
      });
    }

    return itemId;
  },
});

export const archiveMenuItem = mutation({
  args: { itemId: v.id("menuItems") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.itemId, {
      isArchived: true,
      isAvailable: false // Also mark as unavailable
    });
  },
});

export const restoreMenuItem = mutation({
  args: { itemId: v.id("menuItems") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.itemId, {
      isArchived: false,
      // We don't automatically make it available, let user decide
    });
  },
});
