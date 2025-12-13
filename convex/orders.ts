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
      modifiers: v.optional(v.array(v.object({
        modifierId: v.string(),
        quantity: v.number()
      })))
    })),
    customerId: v.optional(v.id("customers")),
  },
  handler: async (ctx, args) => {
    // SECURITY CHECKS
    // SECURITY CHECKS
    // SECURITY CHECKS
    // 1. Check Manager Online Status
    const managers = await ctx.db
      .query("managers")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();

    const now = Date.now();
    const isOnline = managers.some(m => m.isOnline && m.sessionExpiresAt > now);

    // Optional: Add strict time check (e.g. 8 AM) if needed, but managing status via "isOnline" implies manual control + session
    if (!isOnline) {
      throw new Error("Restaurant is currently closed. Please ask a waiter for assistance.");
    }

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
        status: "pending", // Initial status verified
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
      // Security 2: Input Validation
      if (item.quantity < 1 || item.quantity > 999) {
        throw new Error("Invalid quantity (1-999).");
      }
      if (item.notes && item.notes.length > 500) {
        throw new Error("Notes max length exceeded (500 chars).");
      }

      // Try to get menu item
      const dbItem = await ctx.db.get(item.menuItemId as any);

      if (!dbItem) {
        throw new Error(`Item ${item.menuItemId} not found`);
      }

      // Check availability if it has that field (menu items)
      if ('isAvailable' in dbItem && !dbItem.isAvailable) {
        throw new Error(`Menu item ${dbItem.name} is not available`);
      }

      // Calculate modifiers total and validate them
      let modifiersTotal = 0;
      if (item.modifiers) {
        for (const mod of item.modifiers) {
          const modifier: any = await ctx.db.get(mod.modifierId as any);
          if (!modifier) {
            console.warn(`Modifier ${mod.modifierId} not found, skipping price calculation`);
            continue;
          }
          modifiersTotal += modifier.price * mod.quantity;
        }
      }

      await ctx.db.insert("orderItems", {
        orderId,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        notes: item.notes,
        modifiers: item.modifiers,
        addedAt,
      });

      totalAmount += ((dbItem as any).price * item.quantity) + modifiersTotal;
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

            let modifiersWithDetails = undefined;
            if (orderItem.modifiers) {
              modifiersWithDetails = await Promise.all(
                orderItem.modifiers.map(async (mod) => {
                  const modifier = await ctx.db.get(mod.modifierId as any) as any;
                  return {
                    ...mod,
                    name: modifier?.name || "Unknown Extra",
                    price: modifier?.price || 0
                  };
                })
              );
            }

            return {
              ...orderItem,
              menuItem,
              modifiers: modifiersWithDetails || orderItem.modifiers,
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

            let modifiersWithDetails = undefined;
            if (orderItem.modifiers) {
              modifiersWithDetails = await Promise.all(
                orderItem.modifiers.map(async (mod) => {
                  const modifier = await ctx.db.get(mod.modifierId as any) as any;
                  return {
                    ...mod,
                    name: modifier?.name || "Unknown Extra",
                    price: modifier?.price || 0
                  };
                })
              );
            }

            return {
              ...orderItem,
              menuItem,
              modifiers: modifiersWithDetails || orderItem.modifiers,
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

        let modifiersWithDetails = undefined;
        if (orderItem.modifiers) {
          modifiersWithDetails = await Promise.all(
            orderItem.modifiers.map(async (mod) => {
              const modifier = await ctx.db.get(mod.modifierId as any) as any;
              return {
                ...mod,
                name: modifier?.name || "Unknown Extra",
                price: modifier?.price || 0
              };
            })
          );
        }

        return {
          ...orderItem,
          menuItem,
          modifiers: modifiersWithDetails || orderItem.modifiers,
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

            let modifiersWithDetails = undefined;
            if (orderItem.modifiers) {
              modifiersWithDetails = await Promise.all(
                orderItem.modifiers.map(async (mod) => {
                  const modifier = await ctx.db.get(mod.modifierId as any) as any;
                  return {
                    ...mod,
                    name: modifier?.name || "Unknown Extra",
                    price: modifier?.price || 0
                  };
                })
              );
            }

            return {
              ...orderItem,
              menuItem,
              modifiers: modifiersWithDetails || orderItem.modifiers,
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

// Sync revert
