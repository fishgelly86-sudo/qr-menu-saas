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
}

// Super Admin helpers removed.
