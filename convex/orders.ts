import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRestaurantManager } from "./utils";
import { checkRateLimit } from "./security";
import { validateSessionInternal } from "./sessions";

export const createOrder = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    tableNumber: v.string(),
    sessionId: v.string(), // Required for security
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
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
    })),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY 1: Session Validation
    // Look up table by restaurantId and tableNumber first to get tableId
    const table = await ctx.db
      .query("tables")
      .withIndex("by_restaurant_and_number", (q) =>
        q.eq("restaurantId", args.restaurantId).eq("number", args.tableNumber)
      )
      .first();

    if (!table) {
      throw new Error("Table not found. Please scan a valid QR code.");
    }

    // IDEMPOTENCY CHECK
    if (args.idempotencyKey) {
      const existingOrder = await ctx.db
        .query("orders")
        .withIndex("by_restaurant_and_aaa_idempotency", q =>
          q.eq("restaurantId", args.restaurantId).eq("idempotencyKey", args.idempotencyKey)
        )
        .first();

      if (existingOrder) {
        console.log(`Idempotency match: Returning existing order ${existingOrder._id}`);
        return existingOrder._id;
      }
    }

    // VALIDATE SESSION (Server-side enforcement)
    await validateSessionInternal(ctx, args.restaurantId, table._id, args.sessionId);

    // SECURITY 2: Rate Limiting
    // Throttle by Session ID to prevent spam from a single session
    await checkRateLimit(ctx, `order_creation:${args.sessionId}`, "create_order", 5, 60 * 1000);

    // SECURITY 3: Order Item Validation
    if (args.items.length === 0) {
      throw new Error("Cannot place an empty order.");
    }

    // Ensure table is marked as occupied (in case it was free)
    if (table.status !== "occupied") {
      await ctx.db.patch(table._id, { status: "occupied" });
    }

    // APPEND OR CREATE: Check for active (pending) order for this table
    const existingActiveOrder = await ctx.db
      .query("orders")
      .withIndex("by_table_and_status", q => q.eq("tableId", table._id).eq("status", "pending"))
      .first();

    let orderId;
    let currentTotal = 0;

    if (existingActiveOrder) {
      // Append to existing order
      orderId = existingActiveOrder._id;
      currentTotal = existingActiveOrder.totalAmount;
    } else {
      // Create new order
      orderId = await ctx.db.insert("orders", {
        restaurantId: args.restaurantId,
        tableId: table._id,
        status: "pending",
        totalAmount: 0,
        customerId: args.customerId,
        idempotencyKey: args.idempotencyKey,
      });
    }

    // Add order items
    let addedAmount = 0;
    const addedAt = Date.now();

    for (const item of args.items) {
      // Input Validation
      if (item.quantity < 1 || item.quantity > 99) {
        throw new Error("Invalid quantity (1-99).");
      }

      const dbItem = await ctx.db.get(item.menuItemId as any);
      if (!dbItem || (dbItem as any).restaurantId !== args.restaurantId) {
        throw new Error(`Item ${item.menuItemId} not found`);
      }

      if ('isAvailable' in dbItem && !dbItem.isAvailable) {
        throw new Error(`Menu item ${dbItem.name} is not available`);
      }

      let modifiersTotal = 0;
      if (item.modifiers) {
        for (const mod of item.modifiers) {
          const modifier: any = await ctx.db.get(mod.modifierId as any);
          if (!modifier || modifier.restaurantId !== args.restaurantId) {
            throw new Error(`Modifier ${mod.modifierId} not found`);
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

      addedAmount += ((dbItem as any).price * item.quantity) + modifiersTotal;
    }

    await ctx.db.patch(orderId, { totalAmount: currentTotal + addedAmount });

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

    /* Filter out cancelled orders by default if no status is specified - DISABLED: now showing cancelled orders manually
    if (!args.status) {
      orders = orders.filter(o => o.status !== "cancelled");
    } */

    // Filter out archived orders
    orders = orders.filter(o => !o.isArchived);

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

    await requireRestaurantManager(ctx, order.restaurantId);

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

export const updateBatchOrderStatus = mutation({
  args: {
    orderIds: v.array(v.id("orders")),
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
    if (args.orderIds.length === 0) return;

    // Get the first order to check restaurant (assuming all are from same, but we should verify if strict)
    // For efficiency, we'll just check permission once for the general restaurant if possible, 
    // or just assume the `updateOrderStatus` logic's access control per item is fine, 
    // but here we want batch.

    // We'll iterate and patch.
    for (const orderId of args.orderIds) {
      const order = await ctx.db.get(orderId);
      if (!order) continue;

      // We could optimize this check out of the loop if we trust the input, 
      // but for safety we check per order or at least the first one.
      // Let's assume they are from the same restaurant context. 
      // Ideally we check permissions.
      await requireRestaurantManager(ctx, order.restaurantId);

      await ctx.db.patch(orderId, { status: args.status });

      // Handle table status side-effects
      if (args.status === "paid") {
        await ctx.db.patch(order.tableId, { status: "dirty" });
      } else if (args.status === "cancelled") {
        // Only free if ALL orders for this table are cancelled/paid? 
        // The original logic freed it immediately, which might be a bug if other orders exist.
        // But for now keeping consistency with existing logic.
        await ctx.db.patch(order.tableId, { status: "free" });
      }
    }
  },
});

export const cancelOrder = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    await requireRestaurantManager(ctx, order.restaurantId);

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

// Manual Archive Mutation
export const archiveCompletedOrders = mutation({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    // Verify manager 
    await requireRestaurantManager(ctx, args.restaurantId);

    // Find all paid or cancelled orders that are NOT already archived
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_restaurant", q => q.eq("restaurantId", args.restaurantId))
      .collect();

    const ordersToArchive = orders.filter(
      o => (o.status === "paid" || o.status === "cancelled") && !o.isArchived
    );

    await Promise.all(
      ordersToArchive.map(order =>
        ctx.db.patch(order._id, { isArchived: true })
      )
    );

    return { archivedCount: ordersToArchive.length };
  }
});

import { internalMutation } from "./_generated/server";

// Cron Job: Internal Archive All (Global)
export const internalArchiveAllCompletedOrders = internalMutation({
  args: {},
  handler: async (ctx) => {
    // 1. Get all restaurants (optional, could iterate all orders directly)
    // Actually, scanning all orders is better if we have an index.
    // However, we only have by_restaurant or by_restaurant_and_status.

    // We can scan all orders and filter. For scale, we'd want a specific index, 
    // but for now, we iterate.
    const orders = await ctx.db.query("orders").collect();

    const ordersToArchive = orders.filter(
      o => (o.status === "paid" || o.status === "cancelled") && !o.isArchived
    );

    await Promise.all(
      ordersToArchive.map(order =>
        ctx.db.patch(order._id, { isArchived: true })
      )
    );

    console.log(`Archived ${ordersToArchive.length} orders via cron.`);
    return { archivedCount: ordersToArchive.length };
  }
});

export const archiveAndClearTable = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const table = await ctx.db.get(args.tableId);
    if (!table) throw new Error("Table not found");

    await requireRestaurantManager(ctx, table.restaurantId);

    // 1. Archive all active orders for this table
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .collect();

    for (const order of orders) {
      if (!order.isArchived) {
        await ctx.db.patch(order._id, { isArchived: true });
      }
    }

    // 2. Expire active session
    const activeSession = await ctx.db
      .query("tableSessions")
      .withIndex("by_restaurant_table_active", (q: any) =>
        q.eq("restaurantId", table.restaurantId)
          .eq("tableId", args.tableId)
          .eq("status", "active")
      )
      .first();

    if (activeSession) {
      await ctx.db.patch(activeSession._id, { status: "expired" });
    }

    // 3. Reset table status
    await ctx.db.patch(args.tableId, { status: "free" });
  },
});
