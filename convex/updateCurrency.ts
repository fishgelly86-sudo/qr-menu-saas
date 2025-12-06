import { mutation } from "./_generated/server";

export const updateRestaurantCurrency = mutation({
    args: {},
    handler: async (ctx) => {
        const restaurant = await ctx.db
            .query("restaurants")
            .withIndex("by_slug", (q) => q.eq("slug", "burger-bistro"))
            .unique();

        if (restaurant) {
            await ctx.db.patch(restaurant._id, {
                currency: "DA",
            });
            return { message: "Currency updated to DA", restaurantId: restaurant._id };
        }

        return { message: "Restaurant not found" };
    },
});
