import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getTablesByRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const tables = await ctx.db
      .query("tables")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();

    // Filter by assigned tables if applicable
    const userId = await ctx.auth.getUserIdentity();
    if (userId) {
      const staffMember = await ctx.db
        .query("staff")
        .withIndex("by_user", (q) => q.eq("userId", userId.subject))
        .filter((q) => q.eq(q.field("restaurantId"), args.restaurantId))
        .first();

      if (staffMember && staffMember.role === "waiter" && staffMember.assignedTables && staffMember.assignedTables.length > 0) {
        return tables.filter((table) =>
          staffMember.assignedTables!.includes(table._id)
        );
      }
    }

    return tables;
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

export const createVirtualTable = mutation({
  args: {
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, args) => {
    // Generate a unique random alphanumeric code for the virtual table
    // Format: "T-[RANDOM]" e.g. "T-A7B2"
    const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const tableNumber = `TAKEAWAY-${randomCode}`;

    // Check collision (unlikely but good practice)
    const existing = await ctx.db
      .query("tables")
      .withIndex("by_restaurant_and_number", (q) =>
        q.eq("restaurantId", args.restaurantId).eq("number", tableNumber)
      )
      .unique();

    if (existing) {
      // Simple retry logic: just modify the code slightly or throw (client retries)
      // For now, let's just append timestamp if collision
      const timestamp = Date.now().toString().slice(-4);
      const retryNumber = `TAKEAWAY-${randomCode}${timestamp}`;

      const retryId = await ctx.db.insert("tables", {
        restaurantId: args.restaurantId,
        number: retryNumber,
        status: "free", // Initially free, becomes occupied on order
        isVirtual: true,
      });

      return { tableId: retryId, tableNumber: retryNumber };
    }

    const tableId = await ctx.db.insert("tables", {
      restaurantId: args.restaurantId,
      number: tableNumber,
      status: "free",
      isVirtual: true,
    });

    return { tableId, tableNumber };
  },
});

// Import internal mutation for cron
import { internalMutation } from "./_generated/server";

export const cleanupVirtualTables = internalMutation({
  args: {},
  handler: async (ctx) => {
    // 1. Find all virtual tables
    // We don't have a direct index on isVirtual, so we might need to scan. 
    // Optimization: Add index if this becomes slow. For now, scan is okay if table count is low-ish.
    // OR: Filter by those created > 24h ago? We don't have creation time defaults in schema but we have _creationTime system field.

    // Deleting tables older than 24 hours
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

    const tables = await ctx.db.query("tables").collect();

    const virtualTables = tables.filter(t => t.isVirtual === true);

    let deletedCount = 0;
    for (const table of virtualTables) {
      if (table._creationTime < oneDayAgo) {
        // Double check: Are there active orders?
        const activeOrders = await ctx.db
          .query("orders")
          .withIndex("by_table_and_status", q => q.eq("tableId", table._id).eq("status", "pending"))
          .first();

        const preparingOrders = await ctx.db
          .query("orders")
          .withIndex("by_table_and_status", q => q.eq("tableId", table._id).eq("status", "preparing"))
          .first();

        // If no active orders, delete
        if (!activeOrders && !preparingOrders) {
          await ctx.db.delete(table._id);
          deletedCount++;
        }
      }
    }

    console.log(`Cleaned up ${deletedCount} virtual tables.`);
    return deletedCount;
  }
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
    // SECURITY: Fetch table first to get restaurantId for session invalidation
    const table = await ctx.db.get(args.tableId);
    if (!table) throw new Error("Table not found");

    await ctx.db.patch(args.tableId, { status: args.status });

    // If table is marked free:
    // 1. Close the tab (mark orders as paid) and archive them
    // 2. Expire any active sessions for this table
    if (args.status === "free") {
      const activeOrders = await ctx.db
        .query("orders")
        .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
        .collect();

      for (const order of activeOrders) {
        if (!order.isArchived) {
          await ctx.db.patch(order._id, {
            status: "paid",
            isArchived: true
          });
        }
      }

      // Expire active sessions for this table
      const activeSessions = await ctx.db
        .query("tableSessions")
        .withIndex("by_restaurant_table_active", (q: any) =>
          q.eq("restaurantId", table.restaurantId)
            .eq("tableId", args.tableId)
            .eq("status", "active")
        )
        .collect();

      for (const session of activeSessions) {
        await ctx.db.patch(session._id, { status: "expired" });
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

      // Close the tab (mark orders as paid) and archive them
      const activeOrders = await ctx.db
        .query("orders")
        .withIndex("by_table", (q) => q.eq("tableId", table._id))
        .collect();

      for (const order of activeOrders) {
        if (!order.isArchived) {
          // Close the tab by marking order as paid, then archive it
          await ctx.db.patch(order._id, {
            status: "paid",
            isArchived: true
          });
        }
      }

      // Expire active sessions for this table
      const activeSessions = await ctx.db
        .query("tableSessions")
        .withIndex("by_restaurant_table_active", (q: any) =>
          q.eq("restaurantId", args.restaurantId)
            .eq("tableId", table._id)
            .eq("status", "active")
        )
        .collect();

      for (const session of activeSessions) {
        await ctx.db.patch(session._id, { status: "expired" });
      }
    }

    return { message: "All tables reset to free", count: tables.length };
  },
});
