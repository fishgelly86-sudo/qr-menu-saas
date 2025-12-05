import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getMenu = query({
  args: { restaurantSlug: v.string() },
  handler: async (ctx, args) => {
    // Get restaurant by slug
    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_slug", (q) => q.eq("slug", args.restaurantSlug))
      .unique();

    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    // Get categories ordered by rank
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_restaurant_and_rank", (q) => q.eq("restaurantId", restaurant._id))
      .order("asc")
      .collect();

    // Get all menu items for this restaurant (including unavailable ones)
    const menuItems = await ctx.db
      .query("menuItems")
      .withIndex("by_restaurant", (q) =>
        q.eq("restaurantId", restaurant._id)
      )
      .collect();

    // Filter out archived items (just in case) and deleted items
    const activeMenuItems = menuItems.filter(item => !item.isArchived && !item.deletedAt);

    // Group menu items by category
    const categoriesWithItems = categories
      .filter(cat => !cat.deletedAt)
      .map(category => ({
        ...category,
        items: activeMenuItems.filter(item => item.categoryId === category._id)
      }));

    // Get all modifiers for this restaurant
    const modifiers = await ctx.db
      .query("modifiers")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurant._id))
      .collect();

    const activeModifiers = modifiers.filter(m => !m.deletedAt);

    return {
      restaurant: {
        _id: restaurant._id,
        name: restaurant.name,
        currency: restaurant.currency,
        logoUrl: restaurant.logoUrl,
        settings: restaurant.settings,
      },
      categories: categoriesWithItems,
      modifiers: activeModifiers,
    };
  },
});

export const getAdminMenu = query({
  args: { restaurantSlug: v.string() },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_slug", (q) => q.eq("slug", args.restaurantSlug))
      .unique();

    if (!restaurant) throw new Error("Restaurant not found");

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_restaurant_and_rank", (q) => q.eq("restaurantId", restaurant._id))
      .order("asc")
      .collect();

    const menuItems = await ctx.db
      .query("menuItems")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurant._id))
      .collect();

    // Get all modifiers for this restaurant
    const modifiers = await ctx.db
      .query("modifiers")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurant._id))
      .collect();

    const activeModifiers = modifiers.filter(m => !m.deletedAt);

    // Filter out archived items, but KEEP unavailable ones. Filter out deleted items.
    const activeMenuItems = menuItems.filter(item => !item.isArchived && !item.deletedAt);

    const categoriesWithItems = categories
      .filter(cat => !cat.deletedAt)
      .map(category => ({
        ...category,
        items: activeMenuItems.filter(item => item.categoryId === category._id)
      }));

    return {
      restaurant,
      categories: categoriesWithItems,
      modifiers: activeModifiers,
    };
  },
});

export const listRestaurants = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("restaurants").collect();
  },
});

export const getRestaurantBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("restaurants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const getRestaurantsByOwner = query({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("restaurants")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .collect();
  },
});

export const createRestaurant = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    ownerId: v.string(),
    currency: v.string(),
    logoUrl: v.optional(v.string()),
    settings: v.object({
      allowSplitBill: v.boolean(),
      autoUpsell: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    // Check if slug already exists
    const existing = await ctx.db
      .query("restaurants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existing) {
      throw new Error("Restaurant slug already exists");
    }

    return await ctx.db.insert("restaurants", args);
  },
});

export const getTrashItems = query({
  args: { restaurantSlug: v.string() },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_slug", (q) => q.eq("slug", args.restaurantSlug))
      .unique();

    if (!restaurant) throw new Error("Restaurant not found");

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const deletedCategories = await ctx.db
      .query("categories")
      .withIndex("by_restaurant_and_rank", (q) => q.eq("restaurantId", restaurant._id))
      .collect();

    const deletedMenuItems = await ctx.db
      .query("menuItems")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurant._id))
      .collect();

    return {
      categories: deletedCategories.filter(cat => cat.deletedAt && cat.deletedAt > oneDayAgo),
      items: deletedMenuItems.filter(item => item.deletedAt && item.deletedAt > oneDayAgo),
    };
  },
});
