import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Optimized menu expansion script for Burger Bistro.
 * Adds 40 items across 10 categories.
 * Images are restricted to 400x300 to stay under 400kb.
 */
export const seedExpandedMenu = mutation({
    args: {},
    handler: async (ctx) => {
        const slug = "burger-bistro";
        const restaurant = await ctx.db
            .query("restaurants")
            .withIndex("by_slug", (q) => q.eq("slug", slug))
            .unique();

        if (!restaurant) {
            throw new Error(`Restaurant ${slug} not found`);
        }

        const restaurantId = restaurant._id;

        const menuData = [
            {
                category: "Gourmet Pizzas",
                items: [
                    { name: "Truffle Mushroom Pizza", description: "Wild mushrooms, truffle oil, mozzarella, and fresh thyme.", price: 18.5, tags: ["Vegetarian", "Premium"] },
                    { name: "Spicy Salami & Honey", description: "Artisan salami, chili flakes, mozzarella, and a drizzle of hot honey.", price: 16.5, tags: ["Spicy", "Popular"] },
                    { name: "Prosciutto & Arugula", description: "Thinly sliced prosciutto, fresh arugula, parmesan shards, and balsamic glaze.", price: 19.0, tags: ["Classic"] },
                    { name: "Four Cheese Royale", description: "Mozzarella, gorgonzola, parmesan, and ricotta with garlic herb base.", price: 17.0, tags: ["Vegetarian"] },
                ],
                imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop"
            },
            {
                category: "Artisan Pasta",
                items: [
                    { name: "Black Truffle Fettuccine", description: "Handmade fettuccine in a creamy black truffle sauce.", price: 22.0, tags: ["Premium"] },
                    { name: "Seafood Linguine", description: "Fresh shrimp, clams, and mussels in a white wine garlic sauce.", price: 24.5, tags: ["Seafood"] },
                    { name: "Pesto Genovese", description: "Classic basil pesto with pine nuts, parmesan, and extra virgin olive oil.", price: 15.5, tags: ["Vegetarian"] },
                    { name: "Beef Ragu Pappardelle", description: "Slow-cooked beef brisket ragu with wide ribbon pasta.", price: 19.5, tags: ["Classic"] },
                ],
                imageUrl: "https://images.unsplash.com/photo-1473093226795-af9932fe5856?w=400&h=300&fit=crop"
            },
            {
                category: "Fresh Salads",
                items: [
                    { name: "Quinoa Power Bowl", description: "Red quinoa, avocado, kale, roasted sweet potato, and tahini dressing.", price: 14.5, tags: ["Vegan", "Healthy"] },
                    { name: "Greek Summer Salad", description: "Crispy cucumbers, heirloom tomatoes, olives, feta, and oregano.", price: 12.0, tags: ["Vegetarian"] },
                    { name: "Burrata & Heirloom Tomato", description: "Creamy burrata cheese with colorful tomatoes and fresh basil.", price: 16.0, tags: ["Vegetarian", "Premium"] },
                    { name: "Grilled Salmon Caesar", description: "Classic Caesar with lemon-grilled Atlantic salmon.", price: 18.5, tags: ["Healthy"] },
                ],
                imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop"
            },
            {
                category: "Signature Steaks",
                items: [
                    { name: "Wagyu Ribeye", description: "A5 grade Wagyu ribeye served with garlic butter and sea salt.", price: 45.0, tags: ["Premium", "Signature"] },
                    { name: "Peppercorn Filet Mignon", description: "Tender beef tenderloin with a classic creamy peppercorn sauce.", price: 38.0, tags: ["Classic"] },
                    { name: "Tomahawk for Two", description: "Dry-aged 1kg tomahawk steak, served with roasted bone marrow.", price: 85.0, tags: ["Premium", "Shareable"] },
                    { name: "Chimichurri Hanger Steak", description: "Grilled hanger steak with zesty Argentinian green sauce.", price: 28.0, tags: ["Trending"] },
                ],
                imageUrl: "https://images.unsplash.com/photo-1546241072-48010ad28c2c?w=400&h=300&fit=crop"
            },
            {
                category: "Coastal Seafood",
                items: [
                    { name: "Grilled Octopus", description: "Tender octopus with lemon potatoes and smoked paprika oil.", price: 26.0, tags: ["Premium"] },
                    { name: "Seabass en Papillote", description: "Wild seabass baked with Mediterranean vegetables and herbs.", price: 32.0, tags: ["Healthy"] },
                    { name: "Lobster Thermidor", description: "Lobster meat cooked in a rich brandy cream sauce, served in shell.", price: 42.0, tags: ["Premium", "Classic"] },
                    { name: "Fish & Chips Deluxe", description: "Beer-battered cod with mushy peas and house-made tartar sauce.", price: 19.5, tags: ["Classic"] },
                ],
                imageUrl: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=300&fit=crop"
            },
            {
                category: "Japanese Sushi",
                items: [
                    { name: "Dragon Roll", description: "Shrimp tempura, cucumber, topped with avocado and unagi sauce.", price: 18.0, tags: ["Popular"] },
                    { name: "Tuna Sashimi Platter", description: "Premium bluefin tuna slices with fresh wasabi and ginger.", price: 24.0, tags: ["Healthy", "Premium"] },
                    { name: "Spicy Crunch Salmon", description: "Salmon, avocado, spicy mayo, topped with crispy panko.", price: 16.5, tags: ["Spicy"] },
                    { name: "Vegetarian Zen Roll", description: "Pickled radish, avocado, cucumber, and roasted bell pepper.", price: 14.0, tags: ["Vegetarian"] },
                ],
                imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&h=300&fit=crop"
            },
            {
                category: "Authentic Tacos",
                items: [
                    { name: "Al Pastor Tacos", description: "Marinated pork, grilled pineapple, cilantro, and onion.", price: 12.5, tags: ["Classic"] },
                    { name: "Baja Fish Tacos", description: "Crispy fish, cabbage slaw, and chipotle crema on corn tortillas.", price: 14.0, tags: ["Popular"] },
                    { name: "Birria Tacos with Consomé", description: "Slow-cooked beef with melted cheese and rich dipping broth.", price: 16.0, tags: ["Signature"] },
                    { name: "Vegan Mushroom Tacos", description: "Grilled mushrooms, avocado lime crema, and pickled onions.", price: 12.0, tags: ["Vegan"] },
                ],
                imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop"
            },
            {
                category: "Bistro Breakfast",
                items: [
                    { name: "Avocado Toast Special", description: "Sourdough, smashed avocado, poached eggs, and chili flakes.", price: 14.0, tags: ["Healthy", "Popular"] },
                    { name: "Eggs Benedict Platter", description: "Poached eggs, Canadian bacon, and hollandaise on English muffins.", price: 15.5, tags: ["Classic"] },
                    { name: "Blueberry Pancake Stack", description: "Fluffy pancakes with fresh blueberries and maple syrup.", price: 12.5, tags: ["Sweet"] },
                    { name: "Shakshuka", description: "Eggs poached in a spicy tomato and pepper sauce with feta.", price: 13.5, tags: ["Vegetarian"] },
                ],
                imageUrl: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&h=300&fit=crop"
            },
            {
                category: "Handcrafted Desserts",
                items: [
                    { name: "Lava Cake", description: "Warm chocolate cake with a molten center, served with vanilla bean ice cream.", price: 9.5, tags: ["Sweet", "Popular"] },
                    { name: "Classic Tiramisu", description: "Espresso-soaked ladyfingers with mascarpone cream and cocoa.", price: 8.5, tags: ["Classic"] },
                    { name: "New York Cheesecake", description: "Creamy cheesecake with a graham cracker crust and berry compote.", price: 9.0, tags: ["Classic"] },
                    { name: "Mango Passion Sorbet", description: "Refreshing tropical fruit sorbet with fresh mint.", price: 7.5, tags: ["Vegan", "Healthy"] },
                ],
                imageUrl: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=300&fit=crop"
            },
            {
                category: "Premium Drinks",
                items: [
                    { name: "Iced Hibiscus Tea", description: "Cold-brewed hibiscus tea with honey and fresh lime.", price: 5.5, tags: ["Refreshing", "Healthy"] },
                    { name: "Artisanal Cappuccino", description: "Double shot of espresso with silky micro-foam.", price: 4.5, tags: ["Classic"] },
                    { name: "Green Detox Juice", description: "Kale, cucumber, apple, lemon, and ginger blend.", price: 6.5, tags: ["Healthy"] },
                    { name: "Fresh Strawberry Mojito", description: "Non-alcoholic mojito with muddled strawberries and mint.", price: 7.0, tags: ["Refreshing"] },
                ],
                imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop"
            }
        ];

        let categoryRank = 10; // Start ranking after initial ones potentially

        for (const group of menuData) {
            // Find or create category
            let category = await ctx.db
                .query("categories")
                .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurantId))
                .filter((q) => q.eq(q.field("name"), group.category))
                .unique();

            let categoryId;
            if (!category) {
                categoryId = await ctx.db.insert("categories", {
                    restaurantId,
                    name: group.category,
                    rank: categoryRank++,
                });
            } else {
                categoryId = category._id;
            }

            for (const item of group.items) {
                // Check if item exists to avoid duplicates if re-run
                const existingItem = await ctx.db
                    .query("menuItems")
                    .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurantId))
                    .filter((q) => q.and(q.eq(q.field("categoryId"), categoryId), q.eq(q.field("name"), item.name)))
                    .unique();

                if (existingItem) {
                    await ctx.db.patch(existingItem._id, {
                        ...item,
                        imageUrl: group.imageUrl,
                        isAvailable: true,
                    });
                } else {
                    await ctx.db.insert("menuItems", {
                        restaurantId,
                        categoryId,
                        ...item,
                        imageUrl: group.imageUrl,
                        isAvailable: true,
                    });
                }
            }
        }

        return { message: "Menu expansion completed for Burger Bistro", itemsAdded: 40 };
    },
});
