import { internalMutation, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const setDefaults = action({
  args: {},
  handler: async (ctx) => {
    const slug = "burger-bistro";
    const password = "password123";
    const ownerEmail = "manager@burgerbistro.com";

    // Plain text password for dev/mvp
    const hash = password;

    await ctx.runMutation(internal.seedData.updateSearchResult, {
      slug,
      passwordHash: hash,
      ownerEmail,
    });

    return `Updated ${slug} with password: ${password} `;
  },
});

export const updateSearchResult = internalMutation({
  args: {
    slug: v.string(),
    passwordHash: v.string(),
    ownerEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!restaurant) {
      // Create if missing? For now error
      throw new Error(`Restaurant ${args.slug} not found`);
    }

    await ctx.db.patch(restaurant._id, {
      passwordHash: args.passwordHash,
      ownerEmail: args.ownerEmail,
    });
  },
});

export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if demo data already exists
    const existingRestaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_slug", (q) => q.eq("slug", "burger-bistro"))
      .unique();

    if (existingRestaurant) {
      return { message: "Demo data already exists", restaurantId: existingRestaurant._id };
    }

    // Create demo restaurant
    const restaurantId = await ctx.db.insert("restaurants", {
      name: "Burger Bistro",
      slug: "burger-bistro",
      ownerId: "demo-owner-123",
      currency: "DA",
      logoUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=200&h=200&fit=crop&crop=center",
      settings: {
        allowSplitBill: true,
        autoUpsell: true,
      },
      subscriptionStatus: "active",
      plan: "pro",
      subscriptionExpiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
    });

    // Create categories
    const startersId = await ctx.db.insert("categories", {
      restaurantId,
      name: "Starters",
      rank: 1,
    });

    const mainsId = await ctx.db.insert("categories", {
      restaurantId,
      name: "Mains",
      rank: 2,
    });

    const drinksId = await ctx.db.insert("categories", {
      restaurantId,
      name: "Drinks",
      rank: 3,
    });

    // Create menu items
    const menuItems = [
      // Starters
      {
        restaurantId,
        categoryId: startersId,
        name: "Buffalo Wings",
        description: "Crispy chicken wings tossed in spicy buffalo sauce, served with celery and blue cheese dip",
        price: 12.99,
        imageUrl: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400&h=300&fit=crop",
        isAvailable: true,
        tags: ["spicy", "popular"],
      },
      {
        restaurantId,
        categoryId: startersId,
        name: "Loaded Nachos",
        description: "Tortilla chips topped with melted cheese, jalapeños, sour cream, and guacamole",
        price: 10.99,
        imageUrl: "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400&h=300&fit=crop",
        isAvailable: true,
        tags: ["vegetarian", "shareable"],
      },
      // Mains
      {
        restaurantId,
        categoryId: mainsId,
        name: "Classic Cheeseburger",
        description: "Juicy beef patty with cheddar cheese, lettuce, tomato, onion, and our special sauce",
        price: 15.99,
        imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
        isAvailable: true,
        tags: ["popular", "signature"],
      },
      {
        restaurantId,
        categoryId: mainsId,
        name: "BBQ Bacon Burger",
        description: "Beef patty with crispy bacon, BBQ sauce, onion rings, and smoked cheddar",
        price: 17.99,
        imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433a?w=400&h=300&fit=crop",
        isAvailable: true,
        tags: ["popular", "bacon"],
      },
      {
        restaurantId,
        categoryId: mainsId,
        name: "Veggie Burger",
        description: "House-made black bean patty with avocado, sprouts, and chipotle mayo",
        price: 14.99,
        imageUrl: "https://images.unsplash.com/photo-1525059696034-4967a729002e?w=400&h=300&fit=crop",
        isAvailable: true,
        tags: ["vegan", "healthy"],
      },
      {
        restaurantId,
        categoryId: mainsId,
        name: "Crispy Chicken Sandwich",
        description: "Buttermilk fried chicken breast with pickles and spicy mayo on a brioche bun",
        price: 16.99,
        imageUrl: "https://images.unsplash.com/photo-1606755962773-d324e9a13086?w=400&h=300&fit=crop",
        isAvailable: true,
        tags: ["crispy", "spicy"],
      },
      // Drinks
      {
        restaurantId,
        categoryId: drinksId,
        name: "Craft Beer Selection",
        description: "Ask your server about our rotating selection of local craft beers",
        price: 6.99,
        imageUrl: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=300&fit=crop",
        isAvailable: true,
        tags: ["alcohol", "local"],
      },
      {
        restaurantId,
        categoryId: drinksId,
        name: "Fresh Lemonade",
        description: "House-made lemonade with fresh lemons and mint",
        price: 4.99,
        imageUrl: "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&h=300&fit=crop",
        isAvailable: true,
        tags: ["fresh", "non-alcoholic"],
      },
    ];

    for (const item of menuItems) {
      await ctx.db.insert("menuItems", item);
    }

    // Create tables
    await ctx.db.insert("tables", {
      restaurantId,
      number: "1",
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://burger-bistro.demo/table/1`,
      status: "free",
    });

    await ctx.db.insert("tables", {
      restaurantId,
      number: "2",
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://burger-bistro.demo/table/2`,
      status: "free",
    });

    return {
      message: "Demo data seeded successfully",
      restaurantId,
      restaurantSlug: "burger-bistro",
    };
  },
});

export const clearAllData = mutation({
  args: {},
  handler: async (ctx) => {
    // This is a utility function for development - use with caution!
    const tables = [
      "restaurants", "tables", "categories", "menuItems",
      "orders", "orderItems", "feedback", "customers", "waiterCalls"
    ];

    for (const tableName of tables) {
      const docs = await ctx.db.query(tableName as any).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    }

    return { message: "All data cleared successfully" };
  },
});
