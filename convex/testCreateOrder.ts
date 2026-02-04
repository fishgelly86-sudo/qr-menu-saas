import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const testCreate = mutation({
    args: {},
    handler: async (ctx) => {
        // 1. Find Restaurant
        const restaurant = await ctx.db.query("restaurants").withIndex("by_slug", q => q.eq("slug", "burger-bistro")).first();
        if (!restaurant) return "Burger Bistro not found";

        // 2. Find a table
        const table = await ctx.db.query("tables").withIndex("by_restaurant", q => q.eq("restaurantId", restaurant._id)).first();
        if (!table) return "No table found";

        // 3. Find a menu item
        const item = await ctx.db.query("menuItems").first();
        if (!item) return "No item found";

        // 4. Create Order
        // emulate arguments matching createOrder
        const restaurantId = table.restaurantId;

        // We can't call 'createOrder' directly if it checks auth/session in ways we can't mock easily?
        // It checks 'validateSessionInternal'. 
        // We can try to insert directly to verify schema?
        // User reported schema error on insert.

        try {
            const orderId = await ctx.db.insert("orders", {
                restaurantId,
                tableId: table._id,
                status: "needs_approval",
                totalAmount: 100,
            });

            // Insert item
            await ctx.db.insert("orderItems", {
                orderId,
                menuItemId: item?._id || "unknown",
                quantity: 1,
                addedAt: Date.now(),
                status: "needs_approval"
            });

            return "Order created successfully with needs_approval";
        } catch (e: any) {
            return "Error creating order: " + e.message;
        }
    },
});
