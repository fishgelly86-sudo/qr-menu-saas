import { v } from "convex/values";
import { action, internalAction, internalMutation, mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

/**
 * Super Admin Functions
 * These functions allow a super admin to manage restaurants.
 * TODO: Add proper authorization checks (e.g., check for super admin role)
 */

export const listRestaurants = query({
    args: {},
    handler: async (ctx) => {
        // TODO: Add super admin authorization check
        // For now, return all restaurants
        return await ctx.db.query("restaurants").collect();
    },
});

// Helper to check secret
function checkAdminKey(providedKey: string) {
    const expectedSecret = process.env.SUPER_ADMIN_SECRET;
    if (!expectedSecret) throw new Error("Super admin secret not configured");
    if (providedKey !== expectedSecret) throw new Error("Invalid super admin secret key");
}

export const createRestaurant = mutation({
    args: {
        name: v.string(),
        slug: v.string(),
        ownerEmail: v.string(),
        passwordHash: v.string(),
        secretKey: v.string(),
    },
    handler: async (ctx, args) => {
        checkAdminKey(args.secretKey);

        // Check if slug already exists
        const existing = await ctx.db
            .query("restaurants")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();

        if (existing) {
            throw new Error(`Restaurant with slug "${args.slug}" already exists`);
        }

        // Create the restaurant
        const restaurantId = await ctx.db.insert("restaurants", {
            name: args.name,
            slug: args.slug,
            ownerId: "pending", // Will be set when owner claims it
            currency: "DA",
            ownerEmail: args.ownerEmail,
            passwordHash: args.passwordHash,
            settings: {
                allowSplitBill: true,
                autoUpsell: true,
            },
            subscriptionStatus: "trial",
            subscriptionExpiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000, // 14 days trial
            plan: "basic",
            isAcceptingOrders: true,
        });

        return restaurantId;
    },
});

export const updateRestaurantPassword = mutation({
    args: {
        restaurantId: v.id("restaurants"),
        passwordHash: v.string(),
        secretKey: v.string(),
    },
    handler: async (ctx, args) => {
        checkAdminKey(args.secretKey);

        const restaurant = await ctx.db.get(args.restaurantId);
        if (!restaurant) {
            throw new Error("Restaurant not found");
        }

        await ctx.db.patch(args.restaurantId, {
            passwordHash: args.passwordHash,
            passwordChangedAt: Date.now(),
        });

        // Sync with Auth Accounts if owner exists
        if (restaurant.ownerId && restaurant.ownerId !== "pending") {
            await ctx.scheduler.runAfter(0, internal.superAdmin.syncOwnerPassword, {
                ownerId: restaurant.ownerId,
                plainPassword: args.passwordHash,
            });
        }

        return { success: true };
    },
});

export const syncOwnerPassword = internalAction({
    args: {
        ownerId: v.string(),
        plainPassword: v.string(),
    },
    handler: async (ctx, args) => {
        // Password is already hashed by the client/frontend
        // Pass it directly to store in authAccounts
        const hashedSecret = args.plainPassword;

        await ctx.runMutation(internal.superAdmin.updateAuthAccountSecret, {
            ownerId: args.ownerId,
            hashedSecret,
        });
    },
});

export const updateAuthAccountSecret = internalMutation({
    args: {
        ownerId: v.string(),
        hashedSecret: v.string(),
    },
    handler: async (ctx, args) => {
        const authAccount = await ctx.db
            .query("authAccounts")
            .withIndex("userIdAndProvider", (q) =>
                q.eq("userId", args.ownerId as any).eq("provider", "password")
            )
            .first();

        if (authAccount) {
            await ctx.db.patch(authAccount._id, {
                secret: args.hashedSecret,
            });
            console.log(`Synced password for owner ${args.ownerId}`);
        }
    },
});

export const generateImpersonationToken = mutation({
    args: {
        restaurantId: v.id("restaurants"),
        secretKey: v.string(),
    },
    handler: async (ctx, args) => {
        checkAdminKey(args.secretKey);

        // 2. Fetch Restaurant
        const restaurant = await ctx.db.get(args.restaurantId);
        if (!restaurant) {
            throw new Error("Restaurant not found");
        }

        // 3. Return Session Data
        return {
            success: true,
            restaurantId: restaurant._id,
            slug: restaurant.slug,
            name: restaurant.name,
            impersonatedAt: Date.now(),
        };
    },
});

export const updateRestaurantDetails = mutation({
    args: {
        restaurantId: v.id("restaurants"),
        name: v.optional(v.string()),
        slug: v.optional(v.string()),
        ownerEmail: v.optional(v.string()),
        plan: v.optional(v.string()),
        subscriptionStatus: v.optional(v.union(v.literal("active"), v.literal("suspended"), v.literal("trial"))),
        subscriptionExpiresAt: v.optional(v.number()),
        secretKey: v.string(),
    },
    handler: async (ctx, args) => {
        checkAdminKey(args.secretKey);

        const updates: any = {};
        if (args.name !== undefined) updates.name = args.name;

        if (args.ownerEmail !== undefined) {
            const newEmail = args.ownerEmail.trim().toLowerCase();
            updates.ownerEmail = newEmail;

            // Sync with users table
            const restaurant = await ctx.db.get(args.restaurantId);
            if (restaurant && restaurant.ownerId && restaurant.ownerId !== "pending") {
                try {
                    console.log(`Debug Sync: Updating email for restaurant: ${restaurant.name} (${restaurant._id})`);
                    console.log(`Debug Sync: Owner ID: ${restaurant.ownerId}`);
                    console.log(`Debug Sync: New Email: ${args.ownerEmail}`);

                    // Verify user exists first
                    const user = await ctx.db.get(restaurant.ownerId as any);
                    console.log("Debug Sync: Found user:", user);

                    // Update User Email (cast to any to allow string ID)
                    await ctx.db.patch(restaurant.ownerId as any, { email: newEmail });
                    console.log("Debug Sync: User patched");

                    // Update Auth Account (Login Credential)
                    // We need to find the authAccount for this user with provider "password"
                    const authAccount = await ctx.db
                        .query("authAccounts")
                        .withIndex("userIdAndProvider", (q) =>
                            q.eq("userId", restaurant.ownerId as any).eq("provider", "password")
                        )
                        .first();

                    if (authAccount) {
                        console.log("Debug Sync: Found authAccount:", authAccount);
                        // Check if email is already taken by another account
                        const existingAccount = await ctx.db
                            .query("authAccounts")
                            .withIndex("providerAndAccountId", (q) =>
                                q.eq("provider", "password").eq("providerAccountId", newEmail)
                            )
                            .first();

                        if (existingAccount && existingAccount._id !== authAccount._id) {
                            console.error("Debug Sync: Email already taken in authAccounts");
                            throw new Error("Email is already associated with another account");
                        }

                        // Correct field is providerAccountId for password auth
                        await ctx.db.patch(authAccount._id, { providerAccountId: newEmail });
                        console.log("Debug Sync: AuthAccount updated (providerAccountId)");
                    } else {
                        console.log("Debug Sync: No password authAccount found");
                    }

                    // Update Staff entry for this restaurant if it exists
                    const staffEntry = await ctx.db
                        .query("staff")
                        .withIndex("by_user", (q) => q.eq("userId", restaurant.ownerId!))
                        .filter((q) => q.eq(q.field("restaurantId"), args.restaurantId))
                        .first();

                    if (staffEntry) {
                        console.log("Debug Sync: Updating staff entry:", staffEntry._id);
                        await ctx.db.patch(staffEntry._id, { email: newEmail });
                    }
                } catch (error) {
                    console.error("Failed to sync owner email to user record:", error);
                    // We continue even if sync fails, to at least update the restaurant record
                }
            } else {
                console.log("Debug Sync: No valid ownerId found for sync");
            }
        }

        if (args.plan !== undefined) updates.plan = args.plan;
        if (args.subscriptionStatus !== undefined) updates.subscriptionStatus = args.subscriptionStatus;
        if (args.subscriptionExpiresAt !== undefined) updates.subscriptionExpiresAt = args.subscriptionExpiresAt;

        if (args.slug !== undefined) {
            // Check for uniqueness
            const existing = await ctx.db
                .query("restaurants")
                .withIndex("by_slug", (q) => q.eq("slug", args.slug!))
                .first();

            if (existing && existing._id !== args.restaurantId) {
                throw new Error(`Restaurant with slug "${args.slug}" already exists`);
            }
            updates.slug = args.slug;
        }

        await ctx.db.patch(args.restaurantId, updates);
    },
});

export const deleteRestaurant = mutation({
    args: {
        restaurantId: v.id("restaurants"),
        secretKey: v.string(),
    },
    handler: async (ctx, args) => {
        checkAdminKey(args.secretKey);

        await ctx.db.delete(args.restaurantId);
    },
});
