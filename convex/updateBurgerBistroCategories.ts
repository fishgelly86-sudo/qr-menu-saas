import { mutation } from "./_generated/server";

export const updateBurgerBistroCategories = mutation({
    args: {},
    handler: async (ctx) => {
        const slug = "burger-bistro";
        const restaurant = await ctx.db
            .query("restaurants")
            .withIndex("by_slug", (q) => q.eq("slug", slug))
            .unique();

        if (!restaurant) throw new Error("Restaurant not found");

        // Get all categories for this restaurant
        const categories = await ctx.db
            .query("categories")
            .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurant._id))
            .collect();

        // Category enhancements mapping
        const categoryData: Record<string, { name_ar: string; icon: string }> = {
            "Starters": {
                name_ar: "المقبلات",
                icon: "🥗"
            },
            "Mains": {
                name_ar: "الأطباق الرئيسية",
                icon: "🍔"
            },
            "Drinks": {
                name_ar: "المشروبات",
                icon: "🥤"
            },
            "Gourmet Pizzas": {
                name_ar: "بيتزا فاخرة",
                icon: "🍕"
            },
            "Desserts": {
                name_ar: "الحلويات",
                icon: "🍰"
            }
        };

        let updated = 0;
        for (const category of categories) {
            const enhancements = categoryData[category.name];
            if (enhancements) {
                await ctx.db.patch(category._id, {
                    name_ar: enhancements.name_ar,
                    icon: enhancements.icon
                });
                updated++;
            }
        }

        return `Updated ${updated} categories for ${slug}`;
    }
});
