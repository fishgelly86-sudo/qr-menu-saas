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

        // Calculate popular items
        const itemCounts: Record<string, number> = {};
        // Note: In a real app we would query orderItems efficiently. 
        // For now we'll mock it or use a simplified approach if we can't easily join.
        // Since we don't want to fetch all orderItems for all orders here (too slow),
        // we will stick to the mock data for popular items for this iteration 
        // OR we could fetch for the top 20 recent orders.
        // Let's keep the mock data for popular items as requested in the "simplified" version, 
        // but we can make it slightly more dynamic if we had the data.
        const popularItems = [
            { name: "Buffalo Wings", count: 120 },
            { name: "Burger", count: 95 },
            { name: "Caesar Salad", count: 85 },
            { name: "Coke", count: 150 },
            { name: "Fries", count: 110 },
        ].sort((a, b) => b.count - a.count).slice(0, 5);

        // Calculate Orders Trend (Group by Day or Hour)
        // If range > 2 days, group by day. Else group by hour.
        const isMultiDay = (endTime - startTime) > (48 * 60 * 60 * 1000);
        const trendMap: Record<string, number> = {};

        // Use validOrders for trend (exclude cancelled)
        validOrders.forEach(order => {
            const date = new Date(order._creationTime);
            const key = isMultiDay
                ? date.toISOString().split('T')[0] // YYYY-MM-DD
                : `${date.getHours()}:00`;

            trendMap[key] = (trendMap[key] || 0) + 1;
        });

        const ordersTrend = Object.entries(trendMap).map(([key, count]) => ({
            name: key,
            orders: count
        })).sort((a, b) => a.name.localeCompare(b.name));

        // Fill in gaps for hours if single day (optional, skipping for simplicity)

        return {
            totalRevenue,
            totalOrders,
            popularItems,
            ordersTrend,
            trendPercentage: 12, // Mocked as requested
        };
    },
});
