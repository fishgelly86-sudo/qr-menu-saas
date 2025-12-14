import { internalMutation } from "./_generated/server";

/**
 * Migration: Add subscription fields to existing restaurants
 * Run this once to update old restaurants
 */
export const migrateRestaurantsToSubscription = internalMutation({
    args: {},
    handler: async (ctx) => {
        const restaurants = await ctx.db.query("restaurants").collect();

        let updated = 0;
        for (const restaurant of restaurants) {
            // Check if restaurant already has subscription fields
            if (!(restaurant as any).subscriptionStatus) {
                await ctx.db.patch(restaurant._id, {
                    subscriptionStatus: "active",
                    plan: "basic",
                    subscriptionExpiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year from now
                });
                updated++;
            }
        }

        return {
            message: `Migration complete. Updated ${updated} restaurants.`,
            total: restaurants.length,
            updated,
        };
    },
});
