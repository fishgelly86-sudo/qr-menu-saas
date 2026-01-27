import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./utils";

// Generate random invite token
function generateToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Create an invite link for a new staff member
 */
export const createInvite = mutation({
    args: {
        restaurantId: v.id("restaurants"),
        email: v.string(),
        role: v.union(v.literal("manager"), v.literal("waiter")),
    },
    handler: async (ctx, args) => {
        // Security: Only owners/managers can create invites
        const userId = await getUserId(ctx);

        // Check if user is owner or manager of this restaurant
        const staff = await ctx.db
            .query("staff")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("restaurantId"), args.restaurantId))
            .first();

        const restaurant = await ctx.db.get(args.restaurantId);

        if (!restaurant) {
            throw new Error("Restaurant not found");
        }

        // Allow if owner or existing manager
        if (restaurant.ownerId !== userId && (!staff || staff.role === "waiter")) {
            throw new Error("Unauthorized: Only owners and managers can invite staff");
        }

        // Generate unique token
        const token = generateToken();
        const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

        // Create invite
        await ctx.db.insert("invites", {
            token,
            restaurantId: args.restaurantId,
            email: args.email,
            role: args.role,
            expiresAt,
            status: "pending",
            createdBy: userId,
        });

        // Return the invite URL
        return {
            token,
            inviteUrl: `/join?token=${token}`,
        };
    },
});

/**
 * Accept an invite and create staff account
 */
export const acceptInvite = mutation({
    args: {
        token: v.string(),
        name: v.string(),
        password: v.string(),
    },
    handler: async (ctx, args) => {
        // Find the invite
        const invite = await ctx.db
            .query("invites")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();

        if (!invite) {
            throw new Error("Invalid invite token");
        }

        if (invite.status === "used") {
            throw new Error("This invite has already been used");
        }

        if (invite.expiresAt < Date.now()) {
            throw new Error("This invite has expired");
        }

        // Check if user already exists with this email
        const existingStaff = await ctx.db
            .query("staff")
            .withIndex("by_email", (q) => q.eq("email", invite.email))
            .first();

        if (existingStaff) {
            throw new Error("An account with this email already exists");
        }

        // This will be called from the join page which will handle auth signup
        // For now, just mark the invite as ready to use
        // The actual user creation happens via Convex Auth's signIn with flow:"signUp"

        return {
            email: invite.email,
            restaurantId: invite.restaurantId,
            role: invite.role,
            token: args.token,
        };
    },
});

/**
 * Complete staff registration (called after Convex Auth signup)
 */
export const completeStaffRegistration = mutation({
    args: {
        token: v.string(),
        name: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        const identity = await ctx.auth.getUserIdentity();

        // Find and validate invite first
        const invite = await ctx.db
            .query("invites")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();

        if (!invite || invite.status === "used" || invite.expiresAt < Date.now()) {
            throw new Error("Invalid or expired invite");
        }

        // Get email from identity or fall back to invite email
        const email = identity?.email || identity?.tokenIdentifier || invite.email;

        if (!email) {
            throw new Error("No email found");
        }

        // Create staff record
        await ctx.db.insert("staff", {
            userId,
            restaurantId: invite.restaurantId,
            role: invite.role,
            isActive: true,
            email: email,
            name: args.name,
        });

        // Mark invite as used
        await ctx.db.patch(invite._id, { status: "used" });

        return { success: true, restaurantId: invite.restaurantId };
    },
});

/**
 * List all staff for a restaurant
 */
export const listStaff = query({
    args: {
        restaurantId: v.id("restaurants"),
    },
    handler: async (ctx, args) => {
        // Security check
        const userId = await getUserId(ctx);
        const restaurant = await ctx.db.get(args.restaurantId);

        if (!restaurant) {
            throw new Error("Restaurant not found");
        }

        // Only owner and managers can view staff
        const staff = await ctx.db
            .query("staff")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("restaurantId"), args.restaurantId))
            .first();

        if (restaurant.ownerId !== userId && (!staff || staff.role === "waiter")) {
            throw new Error("Unauthorized");
        }

        // Get all staff
        const allStaff = await ctx.db
            .query("staff")
            .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
            .collect();

        return allStaff;
    },
});

/**
 * Revoke staff access
 */
export const revokeAccess = mutation({
    args: {
        staffId: v.id("staff"),
    },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        const staffMember = await ctx.db.get(args.staffId);

        if (!staffMember) {
            throw new Error("Staff member not found");
        }

        const restaurant = await ctx.db.get(staffMember.restaurantId);

        if (!restaurant) {
            throw new Error("Restaurant not found");
        }

        // Only owner can revoke
        if (restaurant.ownerId !== userId) {
            throw new Error("Unauthorized: Only the owner can revoke access");
        }

        // Don't allow owner to revoke themselves
        if (staffMember.userId === userId) {
            throw new Error("Cannot revoke your own access");
        }

        await ctx.db.patch(args.staffId, { isActive: false });
        return { success: true };
    },
});

/**
 * Update assigned tables for a staff member
 */
export const updateStaffAssignments = mutation({
    args: {
        staffId: v.id("staff"),
        tableIds: v.array(v.id("tables")),
    },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        const staffMember = await ctx.db.get(args.staffId);

        if (!staffMember) {
            throw new Error("Staff member not found");
        }

        const restaurant = await ctx.db.get(staffMember.restaurantId);

        if (!restaurant) {
            throw new Error("Restaurant not found");
        }

        // Only owner or manager can assign tables
        if (restaurant.ownerId !== userId) {
            // Check if caller is manager
            const callerStaff = await ctx.db
                .query("staff")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .filter((q) => q.eq(q.field("restaurantId"), restaurant._id))
                .first();

            if (!callerStaff || callerStaff.role !== "manager") {
                throw new Error("Unauthorized");
            }
        }

        await ctx.db.patch(args.staffId, { assignedTables: args.tableIds });
        return { success: true };
    },
});

/**
 * Get current user's role in a restaurant
 */
export const getMyRole = query({
    args: {
        restaurantId: v.id("restaurants"),
    },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        const restaurant = await ctx.db.get(args.restaurantId);

        if (!restaurant) {
            return null;
        }

        // Check if owner
        if (restaurant.ownerId === userId) {
            return { role: "owner" as const, isActive: true };
        }

        // Check staff table
        const staff = await ctx.db
            .query("staff")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("restaurantId"), args.restaurantId))
            .first();

        if (!staff) {
            return null;
        }

        return {
            role: staff.role,
            isActive: staff.isActive,
        };
    },
});
