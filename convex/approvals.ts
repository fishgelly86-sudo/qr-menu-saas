import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRestaurantManager } from "./utils";

export const approveOrder = mutation({
    args: { orderId: v.id("orders") },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.orderId);
        if (!order) throw new Error("Order not found");

        await requireRestaurantManager(ctx, order.restaurantId);

        if (order.status !== "needs_approval") {
            throw new Error("Order is not pending approval.");
        }

        // Move to "pending" (which usually means Sent to Kitchen)
        await ctx.db.patch(args.orderId, { status: "pending" });

        // CRITICAL FIX: Also update status of all items in this order to "pending"
        // Otherwise they remain "needs_approval" and are filtered out by Kitchen
        const items = await ctx.db
            .query("orderItems")
            .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
            .collect();

        for (const item of items) {
            await ctx.db.patch(item._id, { status: "pending" });
        }
    },
});

export const rejectOrder = mutation({
    args: { orderId: v.id("orders") },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.orderId);
        if (!order) throw new Error("Order not found");

        await requireRestaurantManager(ctx, order.restaurantId);

        if (order.status !== "needs_approval") {
            throw new Error("Order is not pending approval.");
        }

        // Move to "cancelled"
        await ctx.db.patch(args.orderId, { status: "cancelled" });

        // Free the table since the order was rejected at the start
        await ctx.db.patch(order.tableId, { status: "free" });
    },
});
