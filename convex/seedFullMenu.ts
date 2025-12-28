import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedFullMenu = mutation({
    args: {
        slug: v.string(), // The slug of the restaurant to seed
    },
    handler: async (ctx, args) => {
        const restaurant = await ctx.db
            .query("restaurants")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .unique();

        if (!restaurant) {
            throw new Error(`Restaurant ${args.slug} not found`);
        }

        const restaurantId = restaurant._id;

        // 10 Categories
        const categoryData = [
            "Burgers", "Pizza", "Pasta", "Salads", "Appetizers",
            "Desserts", "Beverages", "Seafood", "Steaks", "Tacos"
        ];

        const categoryIds: Record<string, any> = {};

        for (let i = 0; i < categoryData.length; i++) {
            const name = categoryData[i];
            const id = await ctx.db.insert("categories", {
                restaurantId,
                name,
                rank: i + 1,
            });
            categoryIds[name] = id;
        }

        const items = [
            // Burgers
            {
                name: "Classic Smash Burger",
                description: "Double beef patty, american cheese, pickles, and bistro sauce.",
                price: 12.99,
                category: "Burgers",
                image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=75&w=600&fit=crop"
            },
            {
                name: "Truffle Mushroom Burger",
                description: "Swiss cheese, sautéed mushrooms, and truffle aioli.",
                price: 16.50,
                category: "Burgers",
                image: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?q=75&w=600&fit=crop"
            },
            {
                name: "Spicy Jalapeño Burger",
                description: "Pepper jack cheese, fresh jalapeños, and spicy habanero mayo.",
                price: 14.99,
                category: "Burgers",
                image: "https://images.unsplash.com/photo-1550547660-d9450f859349?q=75&w=600&fit=crop"
            },
            {
                name: "BBQ Western Burger",
                description: "Bacon, onion rings, cheddar, and tangy BBQ sauce.",
                price: 15.99,
                category: "Burgers",
                image: "https://images.unsplash.com/photo-1596662951482-0c4ba74a6df6?q=75&w=600&fit=crop"
            },
            // Pizza
            {
                name: "Margherita Pizza",
                description: "San Marzano tomatoes, fresh mozzarella, basil, and olive oil.",
                price: 14.00,
                category: "Pizza",
                image: "https://images.unsplash.com/photo-1595854341625-f33ee10dbf94?q=75&w=600&fit=crop"
            },
            {
                name: "Pepperoni Passion",
                description: "Double pepperoni with extra mozzarella cheese.",
                price: 16.00,
                category: "Pizza",
                image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?q=75&w=600&fit=crop"
            },
            {
                name: "Quattro Formaggi",
                description: "Mozzarella, gorgonzola, parmesan, and taleggio cheese.",
                price: 17.50,
                category: "Pizza",
                image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=75&w=600&fit=crop"
            },
            {
                name: "Garden Veggie Pizza",
                description: "Bell peppers, onions, mushrooms, olives, and spinach.",
                price: 15.00,
                category: "Pizza",
                image: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?q=75&w=600&fit=crop"
            },
            // Pasta
            {
                name: "Fettuccine Alfredo",
                description: "Creamy white sauce with parmesan and garlic.",
                price: 13.99,
                category: "Pasta",
                image: "https://images.unsplash.com/photo-1645112481338-35624bb181fd?q=75&w=600&fit=crop"
            },
            {
                name: "Spaghetti Bolognese",
                description: "Slow-cooked beef ragu with fresh herbs and tomatoes.",
                price: 15.50,
                category: "Pasta",
                image: "https://images.unsplash.com/photo-1598866594230-a1a194745ad4?q=75&w=600&fit=crop"
            },
            {
                name: "Pesto Genovese",
                description: "Fresh basil pesto, pine nuts, and parmesan cheese.",
                price: 14.50,
                category: "Pasta",
                image: "https://images.unsplash.com/photo-1473093226795-af9932fe5856?q=75&w=600&fit=crop"
            },
            {
                name: "Lasagna Classica",
                description: "Layers of pasta, meat sauce, and creamy béchamel.",
                price: 16.99,
                category: "Pasta",
                image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=75&w=600&fit=crop"
            },
            // Salads
            {
                name: "Caesar Salad",
                description: "Romaine lettuce, croutons, parmesan, and caesar dressing.",
                price: 11.00,
                category: "Salads",
                image: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?q=75&w=600&fit=crop"
            },
            {
                name: "Greek Salad",
                description: "Cucumbers, tomatoes, olives, feta cheese, and red onions.",
                price: 12.00,
                category: "Salads",
                image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=75&w=600&fit=crop"
            },
            {
                name: "Quinoa Power Bowl",
                description: "Quinoa, avocado, chickpeas, and lemon vinaigrette.",
                price: 14.00,
                category: "Salads",
                image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=75&w=600&fit=crop"
            },
            {
                name: "Caprese Salad",
                description: "Fresh mozzarella, tomatoes, basil, and balsamic glaze.",
                price: 12.50,
                category: "Salads",
                image: "https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?q=75&w=600&fit=crop"
            },
            // Appetizers
            {
                name: "Crispy Calamari",
                description: "Lightly fried squid served with marinara sauce.",
                price: 13.99,
                category: "Appetizers",
                image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?q=75&w=600&fit=crop"
            },
            {
                name: "Mozzarella Sticks",
                description: "Breaded mozzarella served with warm marinara.",
                price: 9.50,
                category: "Appetizers",
                image: "https://images.unsplash.com/photo-1531749956467-0b196191da67?q=75&w=600&fit=crop"
            },
            {
                name: "Garlic Knot Bites",
                description: "Freshly baked garlic knots with herb butter.",
                price: 8.00,
                category: "Appetizers",
                image: "https://images.unsplash.com/photo-1619531029766-44479bc1267d?q=75&w=600&fit=crop"
            },
            {
                name: "Chicken Tenders",
                description: "Gold-fried chicken tenders with honey mustard.",
                price: 11.99,
                category: "Appetizers",
                image: "https://images.unsplash.com/photo-1562967914-608f82629710?q=75&w=600&fit=crop"
            },
            // Desserts
            {
                name: "New York Cheesecake",
                description: "Creamy cheesecake with a graham cracker crust.",
                price: 8.50,
                category: "Desserts",
                image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?q=75&w=600&fit=crop"
            },
            {
                name: "Chocolate Lava Cake",
                description: "Warm chocolate cake with a molten center.",
                price: 9.99,
                category: "Desserts",
                image: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?q=75&w=600&fit=crop"
            },
            {
                name: "Tiramisu",
                description: "Coffee-soaked ladyfingers with mascarpone cream.",
                price: 9.50,
                category: "Desserts",
                image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?q=75&w=600&fit=crop"
            },
            {
                name: "Apple Crumble",
                description: "Warm spiced apples with a buttery oat topping.",
                price: 7.99,
                category: "Desserts",
                image: "https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?q=75&w=600&fit=crop"
            },
            // Beverages
            {
                name: "Classic Lemonade",
                description: "Freshly squeezed lemons with a hint of mint.",
                price: 4.50,
                category: "Beverages",
                image: "https://images.unsplash.com/photo-1621263764928-df1444c5e859?q=75&w=600&fit=crop"
            },
            {
                name: "Iced Caramel Macchiato",
                description: "Espresso with milk and sweet caramel syrup.",
                price: 5.99,
                category: "Beverages",
                image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?q=75&w=600&fit=crop"
            },
            {
                name: "Fresh Orange Juice",
                description: "100% freshly squeezed oranges.",
                price: 5.50,
                category: "Beverages",
                image: "https://images.unsplash.com/photo-1613478223719-2ab802602423?q=75&w=600&fit=crop"
            },
            {
                name: "Mango Smoothie",
                description: "Creamy blend of fresh mangoes and yogurt.",
                price: 6.50,
                category: "Beverages",
                image: "https://images.unsplash.com/photo-1537640538966-79f369b41f8f?q=75&w=600&fit=crop"
            },
            // Seafood
            {
                name: "Grilled Salmon",
                description: "Atlantic salmon with lemon herb butter.",
                price: 24.99,
                category: "Seafood",
                image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=75&w=600&fit=crop"
            },
            {
                name: "Garlic Butter Shrimp",
                description: "Jumbo shrimp sautéed in a garlic white wine sauce.",
                price: 21.00,
                category: "Seafood",
                image: "https://images.unsplash.com/photo-1559739511-e99c1a5cc84d?q=75&w=600&fit=crop"
            },
            {
                name: "Fish & Chips",
                description: "Cod fillets in a crispy beer batter with tartare sauce.",
                price: 18.99,
                category: "Seafood",
                image: "https://images.unsplash.com/photo-1524339102455-67aa975253e3?q=75&w=600&fit=crop"
            },
            {
                name: "Seafood Paella",
                description: "Traditional saffron rice with shrimp, mussels, and squid.",
                price: 28.00,
                category: "Seafood",
                image: "https://images.unsplash.com/photo-1534080564607-317fdb55bc43?q=75&w=600&fit=crop"
            },
            // Steaks
            {
                name: "Ribeye Steak",
                description: "12oz hand-cut ribeye, grilled to perfection.",
                price: 32.99,
                category: "Steaks",
                image: "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?q=75&w=600&fit=crop"
            },
            {
                name: "Filet Mignon",
                description: "8oz tenderloin steak with a red wine reduction.",
                price: 38.00,
                category: "Steaks",
                image: "https://images.unsplash.com/photo-1558030006-450675393462?q=75&w=600&fit=crop"
            },
            {
                name: "Sirloin Steak",
                description: "10oz center-cut sirloin with peppercorn sauce.",
                price: 26.99,
                category: "Steaks",
                image: "https://images.unsplash.com/photo-1546241072-48010ad28c2c?q=75&w=600&fit=crop"
            },
            {
                name: "T-Bone Steak",
                description: "16oz T-Bone served with garlic mashed potatoes.",
                price: 34.99,
                category: "Steaks",
                image: "https://images.unsplash.com/photo-1432139509613-5c4255815697?q=75&w=600&fit=crop"
            },
            // Tacos
            {
                name: "Beef Birria Tacos",
                description: "Slow-cooked beef with melted cheese and consommé.",
                price: 15.99,
                category: "Tacos",
                image: "https://images.unsplash.com/photo-1512838243191-e81e8f66f1fd?q=75&w=600&fit=crop"
            },
            {
                name: "Fish Baja Tacos",
                description: "Crispy fish with cabbage slaw and chipotle cream.",
                price: 14.50,
                category: "Tacos",
                image: "https://images.unsplash.com/photo-1512838243191-e81e8f66f1fd?q=75&w=600&fit=crop"
            },
            {
                name: "Pastor Tacos",
                description: "Marinated pork with pineapple and salsa verde.",
                price: 13.99,
                category: "Tacos",
                image: "https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?q=75&w=600&fit=crop"
            },
            {
                name: "Alambre Tacos",
                description: "Grilled beef, bacon, peppers, and melted cheese.",
                price: 16.50,
                category: "Tacos",
                image: "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?q=75&w=600&fit=crop"
            }
        ];

        for (const item of items) {
            await ctx.db.insert("menuItems", {
                restaurantId,
                categoryId: categoryIds[item.category],
                name: item.name,
                description: item.description,
                price: item.price,
                imageUrl: item.image,
                isAvailable: true,
                tags: [],
            });
        }

        return {
            message: `Seeded ${items.length} items across ${categoryData.length} categories for ${args.slug}`,
        };
    },
});
