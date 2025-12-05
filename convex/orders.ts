import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const createOrder = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    tableNumber: v.string(),
    items: v.array(v.object({
      menuItemId: v.string(),
      quantity: v.number(),
      notes: v.optional(v.string()),
    })),
    customerId: v.optional(v.id("customers")),
  },
  handler: async (ctx, args) => {
    // Look up table by restaurantId and tableNumber
    const existingTable = await ctx.db
      .query("tables")
      .withIndex("by_restaurant_and_number", (q) =>
        q.eq("restaurantId", args.restaurantId).eq("number", args.tableNumber)
      )
      .first();

    let tableId;

    if (existingTable) {
      tableId = existingTable._id;
    } else {
      // Create new table if it doesn't exist
      tableId = await ctx.db.insert("tables", {
        restaurantId: args.restaurantId,
        number: args.tableNumber,
        status: "occupied",
      });
    }

    // Check if there's an existing draft order for this table
    let existingOrder = await ctx.db
      .query("orders")
      .withIndex("by_table_and_status", (q) =>
        q.eq("tableId", tableId).eq("status", "pending")
      )
      .first();

    let orderId;

    if (existingOrder) {
      // Use existing order
      orderId = existingOrder._id;
    } else {
      // Create new order
      orderId = await ctx.db.insert("orders", {
        restaurantId: args.restaurantId,
        tableId: tableId,
        status: "pending",
        totalAmount: 0, // Will be calculated below
        customerId: args.customerId,
      });

      // Update table status to occupied if it was existing
      if (existingTable) {
        await ctx.db.patch(tableId, { status: "occupied" });
      }
    }

    // Add order items
    let totalAmount = existingOrder?.totalAmount || 0;
    const addedAt = Date.now();

    for (const item of args.items) {
      // Try to get menu item
      let menuItem: any = await ctx.db.get(item.menuItemId as any);

      // If not found, try to get modifier
      if (!menuItem) {
        menuItem = await ctx.db.get(item.menuItemId as any);
        // Wait, if it's a modifier ID, we need to query modifiers table?
        // No, ctx.db.get works with ID if we cast it, but we need to know which table if we want to be safe?
        // Actually ctx.db.get(id) works for any table if the ID is valid.
        // But let's be explicit if possible, or just rely on get.
        // However, we need to check availability for menu items, but maybe not for modifiers?
        // Modifiers don't have isAvailable field in our schema yet.
      }

      // Let's try to fetch from menuItems first (if it looks like a menu item ID)
      // Actually, we can just try ctx.db.get. If it returns null, it's invalid.
      // But we need to check isAvailable ONLY if it's a menu item.

      // Better approach:
      // We don't know if it's a menu item or modifier ID just by looking at the string (unless we parse it, but that's internal).
      // We can try to fetch.
      const dbItem = await ctx.db.get(item.menuItemId as any);

      if (!dbItem) {
        throw new Error(`Item ${item.menuItemId} not found`);
      }

      // Check availability if it has that field (menu items)
      if ('isAvailable' in dbItem && !dbItem.isAvailable) {
        throw new Error(`Menu item ${dbItem.name} is not available`);
      }

      await ctx.db.insert("orderItems", {
        orderId,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        notes: item.notes,
        addedAt,
      });

      totalAmount += (dbItem as any).price * item.quantity;
    }

    // Update order total
    await ctx.db.patch(orderId, { totalAmount });

    return orderId;
  },
});

export const getOrdersByRestaurant = query({
  args: {
    restaurantId: v.id("restaurants"),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("served"),
      v.literal("paid"),
      v.literal("cancelled")
    )),
    minDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let orders;

    if (args.status) {
      orders = await ctx.db
        .query("orders")
        .withIndex("by_restaurant_and_status", (q) =>
          q.eq("restaurantId", args.restaurantId).eq("status", args.status!)
        )
        .order("desc")
        .collect();
    } else {
      orders = await ctx.db
        .query("orders")
        .withIndex("by_restaurant", (q) =>
          q.eq("restaurantId", args.restaurantId)
        )
        .order("desc")
        .collect();
    }

    // Filter by minDate if provided
    if (args.minDate) {
      orders = orders.filter(o => o._creationTime >= args.minDate!);
    }

    // Filter out cancelled orders by default if no status is specified
    if (!args.status) {
      orders = orders.filter(o => o.status !== "cancelled");
    }

    // Get order items and table info for each order
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const orderItems = await ctx.db
          .query("orderItems")
          .withIndex("by_order", (q) => q.eq("orderId", order._id))
          .collect();

        const table = await ctx.db.get(order.tableId);

        const itemsWithDetails = await Promise.all(
          orderItems.map(async (orderItem) => {
            const menuItem = await ctx.db.get(orderItem.menuItemId as any);
            return {
              ...orderItem,
              menuItem,
            };
          })
        );

        return {
          ...order,
          table,
          items: itemsWithDetails,
        };
      })
    );

    return ordersWithDetails;
  },
});

export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(
      v.literal("pending"),
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("served"),
      v.literal("paid"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    await ctx.db.patch(args.orderId, { status: args.status });

    // If order is paid or cancelled, update table status to free/dirty
    if (args.status === "paid") {
      await ctx.db.patch(order.tableId, { status: "dirty" });
    } else if (args.status === "cancelled") {
      // If cancelled, free up the table immediately
      await ctx.db.patch(order.tableId, { status: "free" });
    }

    return args.orderId;
  },
});

export const cancelOrder = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    await ctx.db.patch(args.orderId, { status: "cancelled" });

    // Free up the table
    await ctx.db.patch(order.tableId, { status: "free" });
  },
});

export const getOrdersByTable = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .order("desc")
      .collect();

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const orderItems = await ctx.db
          .query("orderItems")
          .withIndex("by_order", (q) => q.eq("orderId", order._id))
          .collect();

        const itemsWithDetails = await Promise.all(
          orderItems.map(async (orderItem) => {
            const menuItem = await ctx.db.get(orderItem.menuItemId as any);
            return {
              ...orderItem,
              menuItem,
            };
          })
        );

        return {
          ...order,
          items: itemsWithDetails,
        };
      })
    );

    return ordersWithItems;
  },
});

export const getOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .collect();

    const itemsWithDetails = await Promise.all(
      orderItems.map(async (orderItem) => {
        const menuItem = await ctx.db.get(orderItem.menuItemId as any);
        return {
          ...orderItem,
          menuItem,
        };
      })
    );

    return {
      ...order,
      items: itemsWithDetails,
    };
  },
});

export const getOrdersByIds = query({
  args: { orderIds: v.array(v.id("orders")) },
  handler: async (ctx, args) => {
    const orders = await Promise.all(
      args.orderIds.map(async (id) => {
        const order = await ctx.db.get(id);
        if (!order) return null;

        const orderItems = await ctx.db
          .query("orderItems")
          .withIndex("by_order", (q) => q.eq("orderId", order._id))
          .collect();

        const itemsWithDetails = await Promise.all(
          orderItems.map(async (orderItem) => {
            const menuItem = await ctx.db.get(orderItem.menuItemId as any);
            return {
              ...orderItem,
              menuItem,
            };
          })
        );

        return {
          ...order,
          items: itemsWithDetails,
        };
      })
    );

    return orders.filter((o) => o !== null && !o.isArchived);
  },
});
