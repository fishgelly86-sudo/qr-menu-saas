import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedGroupOrders = mutation({
    args: {},
    handler: async (ctx) => {
        const slug = "burger-bistro";
        const restaurant = await ctx.db
            .query("restaurants")
            .withIndex("by_slug", (q) => q.eq("slug", slug))
            .unique();

        if (!restaurant) throw new Error("Restaurant not found");

        // Get Table 1
        const table = await ctx.db
            .query("tables")
            .withIndex("by_restaurant_and_number", q => q.eq("restaurantId", restaurant._id).eq("number", "1"))
            .first();

        if (!table) throw new Error("Table 1 not found");

        // Clear existing for table 1 to be clean
        const existingOrders = await ctx.db
            .query("orders")
            .withIndex("by_table", q => q.eq("tableId", table._id))
            .collect();

        for (const order of existingOrders) {
            await ctx.db.delete(order._id);
        }

        // Create 3 orders for Table 1
        const items = await ctx.db.query("menuItems").withIndex("by_restaurant", q => q.eq("restaurantId", restaurant._id)).take(3);

        // Order 1: Guest A
        const order1 = await ctx.db.insert("orders", {
            restaurantId: restaurant._id,
            tableId: table._id,
            status: "pending",
            totalAmount: items[0].price,
        });
        await ctx.db.insert("orderItems", {
            orderId: order1,
            menuItemId: items[0]._id,
            quantity: 1,
            addedAt: Date.now()
        });

        // Order 2: Guest B
        const order2 = await ctx.db.insert("orders", {
            restaurantId: restaurant._id,
            tableId: table._id,
            status: "pending",
            totalAmount: items[1].price,
        });
        await ctx.db.insert("orderItems", {
            orderId: order2,
            menuItemId: items[1]._id,
            quantity: 1,
            addedAt: Date.now()
        });

        // Order 3: Preparing (mid-meal addition?)
        // Actually let's keep them all pending to verify grouping first
        const order3 = await ctx.db.insert("orders", {
            restaurantId: restaurant._id,
            tableId: table._id,
            status: "pending",
            totalAmount: items[2].price,
        });
        await ctx.db.insert("orderItems", {
            orderId: order3,
            menuItemId: items[2]._id,
            quantity: 2,
            notes: "Extra crispy",
            addedAt: Date.now()
        });

        return "Created 3 orders for Table 1";
    }
});
