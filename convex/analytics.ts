import { v } from "convex/values";
import { query } from "./_generated/server";

export const getDashboardStats = query({
    args: {
        restaurantId: v.id("restaurants"),
        startTime: v.optional(v.number()),
        endTime: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const now = new Date();

        // Default start time: 4:00 AM today
        const defaultStart = new Date(now);
        defaultStart.setHours(4, 0, 0, 0);
        // If now is before 4 AM, use yesterday's 4 AM
        if (now.getHours() < 4) {
            defaultStart.setDate(defaultStart.getDate() - 1);
        }

        const startTime = args.startTime || defaultStart.getTime();
        const endTime = args.endTime || now.getTime();

        const orders = await ctx.db
            .query("orders")
            .withIndex("by_restaurant", (q) =>
                q.eq("restaurantId", args.restaurantId)
            )
            .collect();

        // Filter orders by date range
        const filteredOrders = orders.filter(o =>
            o._creationTime >= startTime &&
            o._creationTime <= endTime
        );

        // 1. Total Revenue: Only sum 'paid' orders
        const paidOrders = filteredOrders.filter(o => o.status === "paid");
        const totalRevenue = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);

        // 2. Total Order Count: All orders EXCEPT 'cancelled'
        const validOrders = filteredOrders.filter(o => o.status !== "cancelled");
        const totalOrders = validOrders.length;

        // Calculate Revenue by Category
        // 1. Get all order items for paid orders
        const orderItemsPromises = paidOrders.map(order =>
            ctx.db.query("orderItems")
                .withIndex("by_order", q => q.eq("orderId", order._id))
                .collect()
        );
        const allOrderItems = (await Promise.all(orderItemsPromises)).flat();

        // 2. Get all menu items and categories to map IDs
        const menuItems = await ctx.db.query("menuItems")
            .withIndex("by_restaurant", q => q.eq("restaurantId", args.restaurantId))
            .collect();
        const menuItemMap = new Map(menuItems.map(item => [item._id, item]));

        const categories = await ctx.db.query("categories")
            .withIndex("by_restaurant", q => q.eq("restaurantId", args.restaurantId))
            .collect();
        const categoryMap = new Map(categories.map(cat => [cat._id, cat.name]));

        // 3. Aggregate revenue
        const categoryRevenue: Record<string, number> = {};
        let totalCategoryRevenue = 0;

        for (const item of allOrderItems) {
            const menuItem = menuItemMap.get(item.menuItemId as any);
            if (menuItem) {
                const catName = categoryMap.get(menuItem.categoryId) || "Uncategorized";
                const revenue = menuItem.price * item.quantity;
                categoryRevenue[catName] = (categoryRevenue[catName] || 0) + revenue;
                totalCategoryRevenue += revenue;
            }
        }

        // 4. Format for chart
        // Colors from design system (Indigo, Emerald, Amber, Red, Violet, Pink, Cyan, Teal)
        const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

        const revenueByCategory = Object.entries(categoryRevenue)
            .map(([name, value], index) => ({
                name,
                value,
                fill: COLORS[index % COLORS.length]
            }))
            .sort((a, b) => b.value - a.value);

        // 5. Calculate Most Picked Item
        const itemStats: Record<string, { count: number; revenue: number; menuItemId: string }> = {};

        for (const item of allOrderItems) {
            const stats = itemStats[item.menuItemId] || { count: 0, revenue: 0, menuItemId: item.menuItemId };
            const menuItem = menuItemMap.get(item.menuItemId as any);
            if (menuItem) {
                stats.count += item.quantity;
                stats.revenue += item.quantity * menuItem.price;
                itemStats[item.menuItemId] = stats;
            }
        }

        const mostPicked = Object.values(itemStats).sort((a, b) => b.count - a.count)[0];
        let mostPickedItem = null;

        if (mostPicked) {
            const menuItem = menuItemMap.get(mostPicked.menuItemId as any);
            if (menuItem) {
                mostPickedItem = {
                    name: menuItem.name,
                    imageUrl: menuItem.imageUrl,
                    count: mostPicked.count,
                    revenue: mostPicked.revenue
                };
            }
        }

        return {
            totalRevenue,
            totalOrders,
            revenueByCategory,
            mostPickedItem,
        };
    },
});
