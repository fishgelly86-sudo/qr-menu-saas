import { internalMutation } from "./_generated/server";

export const deleteOldSoftDeletedItems = internalMutation({
    args: {},
    handler: async (ctx) => {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

        // Cleanup menu items
        const deletedItems = await ctx.db
            .query("menuItems")
            .filter((q) => q.gt(q.field("deletedAt"), 0))
            .collect();

        for (const item of deletedItems) {
            if (item.deletedAt && item.deletedAt < oneDayAgo) {
                await ctx.db.delete(item._id);
            }
        }

        // Cleanup categories
        const deletedCategories = await ctx.db
            .query("categories")
            .filter((q) => q.gt(q.field("deletedAt"), 0))
            .collect();

        for (const cat of deletedCategories) {
            if (cat.deletedAt && cat.deletedAt < oneDayAgo) {
                await ctx.db.delete(cat._id);
            }
        }
    },
});
