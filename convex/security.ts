import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./utils";

// Rate limit configuration
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10; // 10 requests per minute

/**
 * Check if a user/IP is rate limited
 * Returns true if allowed, throws error if limited
 */
export async function checkRateLimit(
    ctx: MutationCtx,
    identifier: string,
    action: string,
    limit: number = MAX_REQUESTS,
    windowMs: number = WINDOW_MS
) {
    const now = Date.now();
    const existing = await ctx.db
        .query("rate_limits")
        .withIndex("by_identifier_action", (q) =>
            q.eq("identifier", identifier).eq("action", action)
        )
        .first();

    if (existing) {
        if (existing.expiresAt < now) {
            // Window expired, reset
            await ctx.db.patch(existing._id, {
                count: 1,
                expiresAt: now + windowMs,
            });
            return;
        }

        if (existing.count >= limit) {
            throw new Error(`Rate limit exceeded. Please try again later.`);
        }

        await ctx.db.patch(existing._id, {
            count: existing.count + 1,
        });
    } else {
        // Create new record
        await ctx.db.insert("rate_limits", {
            identifier,
            action,
            count: 1,
            expiresAt: now + windowMs,
        });
    }

    /**
     * Super Admin Claim
     * Allows a user to claim super admin privileges using a secret key
     */
    export const claimSuperAdmin = mutation({
        args: {
            secretKey: v.string(),
        },
        handler: async (ctx, args) => {
            const identity = await ctx.auth.getUserIdentity();
            if (!identity) {
                throw new Error("Unauthorized: Please log in first");
            }

            // Check against environment variable
            // Set SUPER_ADMIN_SECRET in your Convex dashboard environment variables
            const expectedSecret = process.env.SUPER_ADMIN_SECRET;
            if (!expectedSecret) {
                throw new Error("Super admin secret not configured");
            }

            if (args.secretKey !== expectedSecret) {
                throw new Error("Invalid secret key");
            }

            // Find user by token identifier
            const user = await ctx.db
                .query("users")
                .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
                .first();

            if (!user) {
                throw new Error("User not found");
            }

            // Update user role to super_admin
            await ctx.db.patch(user._id, {
                role: "super_admin"
            });

            return { success: true, message: "Super admin privileges granted" };
        },
    });
