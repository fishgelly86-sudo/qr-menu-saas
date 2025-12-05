import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const trackVisit = mutation({
  args: {
    deviceId: v.string(),
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, args) => {
    // Check if customer exists
    let customer = await ctx.db
      .query("customers")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
      .unique();

    if (customer) {
      // Update existing customer
      await ctx.db.patch(customer._id, {
        visitCount: customer.visitCount + 1,
        lastVisitAt: Date.now(),
      });
      return customer._id;
    } else {
      // Create new customer
      const customerId = await ctx.db.insert("customers", {
        deviceId: args.deviceId,
        visitCount: 1,
        lastVisitAt: Date.now(),
      });
      return customerId;
    }
  },
});

export const getCustomerByDevice = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customers")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
      .unique();
  },
});

export const getCustomerStats = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    // Get all orders for this restaurant with customer IDs
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();

    const customerIds = [...new Set(orders.map(o => o.customerId).filter(Boolean))];
    
    if (customerIds.length === 0) {
      return {
        totalCustomers: 0,
        returningCustomers: 0,
        averageVisits: 0,
      };
    }

    const customers = await Promise.all(
      customerIds.map(id => ctx.db.get(id!))
    );

    const validCustomers = customers.filter(Boolean);
    const returningCustomers = validCustomers.filter(c => c!.visitCount > 1);
    const totalVisits = validCustomers.reduce((sum, c) => sum + c!.visitCount, 0);

    return {
      totalCustomers: validCustomers.length,
      returningCustomers: returningCustomers.length,
      averageVisits: validCustomers.length > 0 ? Math.round((totalVisits / validCustomers.length) * 100) / 100 : 0,
    };
  },
});
