import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getTablesByRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tables")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
  },
});

export const getTableByNumber = query({
  args: {
    restaurantId: v.id("restaurants"),
    tableNumber: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tables")
      .withIndex("by_restaurant_and_number", (q) =>
        q.eq("restaurantId", args.restaurantId).eq("number", args.tableNumber)
      )
      .unique();
  },
});

export const createTable = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    number: v.string(),
    qrCodeUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if table number already exists for this restaurant
    const existing = await ctx.db
      .query("tables")
      .withIndex("by_restaurant_and_number", (q) =>
        q.eq("restaurantId", args.restaurantId).eq("number", args.number)
      )
      .unique();

    if (existing) {
      throw new Error("Table number already exists for this restaurant");
    }

    return await ctx.db.insert("tables", {
      restaurantId: args.restaurantId,
      number: args.number,
      qrCodeUrl: args.qrCodeUrl,
      status: "free",
    });
  },
});

// Update table status - supports reserved status
export const updateTableStatus = mutation({
  args: {
    tableId: v.id("tables"),
    status: v.union(v.literal("free"), v.literal("occupied"), v.literal("payment_pending"), v.literal("dirty")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tableId, { status: args.status });

    // If table is marked free, archive all active orders for this table
    if (args.status === "free") {
      const activeOrders = await ctx.db
        .query("orders")
        .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
        .collect();

      for (const order of activeOrders) {
        if (!order.isArchived) {
          await ctx.db.patch(order._id, { isArchived: true });
        }
      }
    }

    return args.tableId;
  },
});

export const deleteTable = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.tableId);
  },
});

export const resetAllTables = mutation({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const tables = await ctx.db
      .query("tables")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();

    for (const table of tables) {
      await ctx.db.patch(table._id, { status: "free" });

      // Archive all active orders for this table
      const activeOrders = await ctx.db
        .query("orders")
        .withIndex("by_table", (q) => q.eq("tableId", table._id))
        .collect();

      for (const order of activeOrders) {
        if (!order.isArchived) {
          await ctx.db.patch(order._id, { isArchived: true });
        }
      }
    }

    return { message: "All tables reset to free", count: tables.length };
  },
});
