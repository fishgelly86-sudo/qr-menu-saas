import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const submitFeedback = mutation({
  args: {
    orderId: v.id("orders"),
    rating: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get order to get restaurant ID
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // If rating < 4, mark as private
    const isPrivate = args.rating < 4;

    const feedbackId = await ctx.db.insert("feedback", {
      restaurantId: order.restaurantId,
      orderId: args.orderId,
      rating: args.rating,
      comment: args.comment,
      isPrivate,
    });

    return feedbackId;
  },
});

export const getFeedbackByRestaurant = query({
  args: { 
    restaurantId: v.id("restaurants"),
    includePrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let feedback;

    if (args.includePrivate) {
      feedback = await ctx.db
        .query("feedback")
        .withIndex("by_restaurant", (q) => 
          q.eq("restaurantId", args.restaurantId)
        )
        .order("desc")
        .collect();
    } else {
      feedback = await ctx.db
        .query("feedback")
        .withIndex("by_restaurant_and_private", (q) => 
          q.eq("restaurantId", args.restaurantId).eq("isPrivate", false)
        )
        .order("desc")
        .collect();
    }

    // Get order info for each feedback
    const feedbackWithOrders = await Promise.all(
      feedback.map(async (fb) => {
        const order = await ctx.db.get(fb.orderId);
        return {
          ...fb,
          order,
        };
      })
    );

    return feedbackWithOrders;
  },
});

export const getFeedbackStats = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const allFeedback = await ctx.db
      .query("feedback")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();

    if (allFeedback.length === 0) {
      return {
        averageRating: 0,
        totalFeedback: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const totalRating = allFeedback.reduce((sum, fb) => sum + fb.rating, 0);
    const averageRating = totalRating / allFeedback.length;

    const ratingDistribution = allFeedback.reduce((dist, fb) => {
      dist[fb.rating as keyof typeof dist] = (dist[fb.rating as keyof typeof dist] || 0) + 1;
      return dist;
    }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

    return {
      averageRating: Math.round(averageRating * 100) / 100,
      totalFeedback: allFeedback.length,
      ratingDistribution,
    };
  },
});
