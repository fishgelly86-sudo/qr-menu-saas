import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const callWaiter = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    tableNumber: v.string(),
    type: v.union(v.literal("water"), v.literal("bill"), v.literal("help")),
  },
  handler: async (ctx, args) => {
    // Look up table by restaurantId and tableNumber
    const table = await ctx.db
      .query("tables")
      .withIndex("by_restaurant_and_number", (q) =>
        q.eq("restaurantId", args.restaurantId).eq("number", args.tableNumber)
      )
      .first();

    let tableId;

    if (table) {
      tableId = table._id;
    } else {
      // Create new table if it doesn't exist (similar to createOrder logic)
      tableId = await ctx.db.insert("tables", {
        restaurantId: args.restaurantId,
        number: args.tableNumber,
        status: "occupied",
      });
    }

    // Create waiter call
    const callId = await ctx.db.insert("waiterCalls", {
      restaurantId: args.restaurantId,
      tableId: tableId,
      type: args.type,
      status: "pending",
    });

    return callId;
  },
});

export const getWaiterCallsByRestaurant = query({
  args: {
    restaurantId: v.id("restaurants"),
    status: v.optional(v.union(v.literal("pending"), v.literal("resolved"))),
  },
  handler: async (ctx, args) => {
    let calls;

    if (args.status) {
      calls = await ctx.db
        .query("waiterCalls")
        .withIndex("by_restaurant_and_status", (q) =>
          q.eq("restaurantId", args.restaurantId).eq("status", args.status!)
        )
        .order("desc")
        .collect();
    } else {
      calls = await ctx.db
        .query("waiterCalls")
        .withIndex("by_restaurant", (q) =>
          q.eq("restaurantId", args.restaurantId)
        )
        .order("desc")
        .collect();
    }

    // Filter by assigned tables if applicable
    const userId = await ctx.auth.getUserIdentity();
    if (userId) {
      const staffMember = await ctx.db
        .query("staff")
        .withIndex("by_user", (q) => q.eq("userId", userId.subject))
        .filter((q) => q.eq(q.field("restaurantId"), args.restaurantId))
        .first();

      if (staffMember && staffMember.role === "waiter" && staffMember.assignedTables && staffMember.assignedTables.length > 0) {
        calls = calls.filter((call) =>
          staffMember.assignedTables!.includes(call.tableId)
        );
      }
    }

    // Get table info for each call
    const callsWithTables = await Promise.all(
      calls.map(async (call) => {
        const table = await ctx.db.get(call.tableId);
        return {
          ...call,
          table,
        };
      })
    );

    return callsWithTables;
  },
});

export const resolveWaiterCall = mutation({
  args: { callId: v.id("waiterCalls") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.callId, {
      status: "resolved",
      resolvedAt: Date.now(),
    });
    return args.callId;
  },
});
