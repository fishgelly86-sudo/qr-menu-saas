import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

const DEFAULT_TIMEOUT = 20; // 20 minutes

export const createTableSession = mutation({
    args: {
        restaurantId: v.id("restaurants"),
        tableNumber: v.string(),
        sessionId: v.string(), // Client-side generated UUID or similar
        location: v.optional(v.object({
            latitude: v.number(),
            longitude: v.number(),
        })),
    },
    handler: async (ctx, args) => {
        const now = Date.now();

        // Find table by number
        const table = await ctx.db
            .query("tables")
            .withIndex("by_restaurant_and_number", (q: any) =>
                q.eq("restaurantId", args.restaurantId).eq("number", args.tableNumber)
            )
            .first();

        if (!table) {
            throw new Error("Invalid table number");
        }

        const tableId = table._id;

        // Check if table is occupied or has an active session
        const existingSession = await ctx.db
            .query("tableSessions")
            .withIndex("by_restaurant_table_active", (q: any) =>
                q.eq("restaurantId", args.restaurantId)
                    .eq("tableId", tableId)
                    .eq("status", "active")
            )
            .first();

        if (existingSession) {
            // If we already have a session for this table, we might allow joining it
            // but for simplicity, if the client provides the SAME sessionId, we just refresh it.
            if (existingSession.sessionId === args.sessionId) {
                await ctx.db.patch(existingSession._id, {
                    lastActivityAt: now,
                });
                return { sessionId: existingSession.sessionId, status: "active" };
            }
            // If a different session is active, we check if it's expired
            const restaurant = await ctx.db.get(args.restaurantId);
            const timeout = (restaurant?.sessionTimeout || DEFAULT_TIMEOUT) * 60 * 1000;

            if (now - existingSession.lastActivityAt > timeout) {
                // Expire the old one
                await ctx.db.patch(existingSession._id, { status: "expired" });
            } else {
                // Table is currently busy with another session
                // For zero-friction, we might allow multiple devices to share a session if they have the same QR?
                // But the requirement says "Each table can have only one active session at a time."
                // We let the new one take over IF the old one is stale, otherwise we return the active one's ID
                // so the client can potentially sync.
                return { sessionId: existingSession.sessionId, status: "active", message: "Joined existing session" };
            }
        }

        // Create new session
        await ctx.db.insert("tableSessions", {
            restaurantId: args.restaurantId,
            tableId: tableId,
            sessionId: args.sessionId,
            lastActivityAt: now,
            status: "active",
            location: args.location,
        });

        // Update table status to occupied
        await ctx.db.patch(tableId, { status: "occupied" });

        return { sessionId: args.sessionId, status: "active" };
    },
});

export const refreshSession = mutation({
    args: {
        sessionId: v.string(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("tableSessions")
            .withIndex("by_session", (q: any) => q.eq("sessionId", args.sessionId))
            .first();

        if (!session || session.status === "expired") {
            return { success: false, error: "Session not found or expired" };
        }

        const restaurant = await ctx.db.get(session.restaurantId);
        if (!restaurant || restaurant.isAcceptingOrders === false) {
            return { success: false, error: "Restaurant is closed" };
        }

        const timeout = (restaurant.sessionTimeout || DEFAULT_TIMEOUT) * 60 * 1000;
        const now = Date.now();

        if (now - session.lastActivityAt > timeout) {
            await ctx.db.patch(session._id, { status: "expired" });
            return { success: false, error: "Session expired" };
        }

        await ctx.db.patch(session._id, { lastActivityAt: now });
        return { success: true };
    },
});

export const heartbeatSession = mutation({
    args: {
        sessionId: v.string(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("tableSessions")
            .withIndex("by_session", (q: any) => q.eq("sessionId", args.sessionId))
            .first();

        if (!session || session.status !== "active") {
            return { success: false };
        }

        // Simple heartbeat - just update lastActivityAt
        await ctx.db.patch(session._id, { lastActivityAt: Date.now() });
        return { success: true };
    },
});

export const getSessionStatus = query({
    args: { sessionId: v.string() },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("tableSessions")
            .withIndex("by_session", (q: any) => q.eq("sessionId", args.sessionId))
            .first();

        if (!session) return { status: "not_found" };

        const restaurant = await ctx.db.get(session.restaurantId);
        const timeout = (restaurant?.sessionTimeout || DEFAULT_TIMEOUT) * 60 * 1000;
        const now = Date.now();

        if (session.status === "active" && now - session.lastActivityAt > timeout) {
            // We don't patch here because it's a query, but we report it as expired
            return { ...session, status: "expired" as const };
        }

        return session;
    },
});

// Internal helper for order validation
export async function validateSessionInternal(
    ctx: any,
    restaurantId: Id<"restaurants">,
    tableId: Id<"tables">,
    sessionId: string
) {
    // Optimized Validation: Look up by Table first (since we know the context)
    // This avoids issues if the same sessionId exists for another table (stale data)
    const session = await ctx.db
        .query("tableSessions")
        .withIndex("by_restaurant_table_active", (q: any) =>
            q.eq("restaurantId", restaurantId)
                .eq("tableId", tableId)
                .eq("status", "active")
        )
        .first();

    if (!session) {
        // Fallback: Check if it was expired recently to give better error
        throw new Error("No active session found. Please refresh the page or scan the QR code again to start a new session.");
    }

    if (session.sessionId !== sessionId) {
        // The table has a session, but it doesn't match the one provided
        throw new Error("Invalid session token. Please re-scan the QR code.");
    }

    // session is guaranteed active and matches context

    const restaurant = await ctx.db.get(restaurantId);
    if (!restaurant) throw new Error("Restaurant not found.");
    if (restaurant.isAcceptingOrders === false) throw new Error("Restaurant is currently closed.");

    const timeout = (restaurant.sessionTimeout || DEFAULT_TIMEOUT) * 60 * 1000;
    const now = Date.now();

    if (now - session.lastActivityAt > timeout) {
        await ctx.db.patch(session._id, { status: "expired" });
        throw new Error("Session expired due to inactivity.");
    }

    // Check table status
    const table = await ctx.db.get(tableId);
    if (!table) { // removed table.status === "free" check
        throw new Error("Table not found.");
    }

    // Update activity
    await ctx.db.patch(session._id, { lastActivityAt: now });

    return session;
}

// Internal Mutation: Cleanup Expired Sessions (for CRON)
export const internalCleanupExpiredSessions = internalMutation({
    handler: async (ctx) => {
        const now = Date.now();
        let expiredCount = 0;

        // Get all active sessions
        const activeSessions = await ctx.db
            .query("tableSessions")
            .filter((q: any) => q.eq(q.field("status"), "active"))
            .collect();

        for (const session of activeSessions) {
            // Get restaurant to check timeout setting
            const restaurant = await ctx.db.get(session.restaurantId);
            if (!restaurant) continue;

            const timeout = (restaurant.sessionTimeout || DEFAULT_TIMEOUT) * 60 * 1000;

            // Check if session has exceeded timeout
            if (now - session.lastActivityAt > timeout) {
                await ctx.db.patch(session._id, { status: "expired" });
                expiredCount++;
            }
        }

        console.log(`Session cleanup: ${expiredCount} sessions marked as expired`);
        return { success: true, expiredCount };
    },
});

