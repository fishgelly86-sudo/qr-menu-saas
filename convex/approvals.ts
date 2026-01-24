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
