import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const checkWaiterData = mutation({
    args: { restaurantSlug: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const slug = args.restaurantSlug || "burger-bistro";

        const restaurant = await ctx.db
            .query("restaurants")
            .withIndex("by_slug", (q) => q.eq("slug", slug))
            .first();

        if (!restaurant) return "Restaurant not found";

        console.log(`Restaurant: ${restaurant.name} (${restaurant._id})`);
        console.log(`Settings:`, restaurant.settings);

        // Check all recent orders
        const orders = await ctx.db
            .query("orders")
            .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurant._id))
            .order("desc")
            .take(10);

        const report = [];
        for (const order of orders) {
            // Count items
            const items = await ctx.db.query("orderItems").withIndex("by_order", q => q.eq("orderId", order._id)).collect();
            const table = await ctx.db.get(order.tableId);

            report.push({
                id: order._id,
                status: order.status,
                total: order.totalAmount,
                itemsCount: items.length,
                created: new Date(order._creationTime).toISOString(),
                tableId: order.tableId,
                tableName: table ? table.number : "NULL TABLE",
                isVirtual: table ? table.isVirtual : "N/A"
                // itemsStatus: items.map(i => i.status) // orderItems might not have status in schema before my fix? 
                // wait, I added it to schema.
            });
        }

        // Check specifically for needs_approval
        const approvalOrders = await ctx.db
            .query("orders")
            .withIndex("by_restaurant_and_status", (q) =>
                q.eq("restaurantId", restaurant._id).eq("status", "needs_approval")
            )
            .collect();

        // Check pending orders
        const pendingOrders = await ctx.db
            .query("orders")
            .withIndex("by_restaurant_and_status", (q) =>
                q.eq("restaurantId", restaurant._id).eq("status", "pending")
            )
            .collect();

        // Check tables for approval orders
        for (const o of approvalOrders) {
            const t = await ctx.db.get(o.tableId);
            console.log(`Approval Order ${o._id}: Table ${t?.number} (Virtual: ${t?.isVirtual}) status=${o.status}`);
        }

        // Check tables for pending orders
        for (const o of pendingOrders) {
            const t = await ctx.db.get(o.tableId);
            console.log(`Pending Order ${o._id}: Table ${t?.number} (Virtual: ${t?.isVirtual}) status=${o.status}`);
        }

        return {
            recentOrders: report,
            approvalOrdersCount: approvalOrders.length,
            pendingOrdersCount: pendingOrders.length,
            approvalOrdersIds: approvalOrders.map(o => o._id)
        };
    },
});
