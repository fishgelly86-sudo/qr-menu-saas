import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createQRCode = mutation({
    args: {
        restaurantId: v.id("restaurants"),
        tableId: v.optional(v.id("tables")),
        type: v.union(v.literal("menu"), v.literal("payment")),
    },
    handler: async (ctx, args) => {
        const code = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const now = Date.now();
        const ninetyDays = 90 * 24 * 60 * 60 * 1000;

        const id = await ctx.db.insert("qrcodes", {
            restaurantId: args.restaurantId,
            tableId: args.tableId,
            code,
            type: args.type,
            isActive: true,
            expiresAt: now + ninetyDays,
        });

        return { code, id };
    },
});

export const validateQRCode = query({
    args: {
        code: v.string(),
    },
    handler: async (ctx, args) => {
        const qr = await ctx.db
            .query("qrcodes")
            .withIndex("by_code", (q) => q.eq("code", args.code))
            .first();

        if (!qr) {
            return { isValid: false, error: "QR Code not found" };
        }

        if (!qr.isActive) {
            return { isValid: false, error: "QR Code is inactive" };
        }

        if (qr.expiresAt < Date.now()) {
            return { isValid: false, error: "QR Code expired" };
        }

        // Optional: Check if restaurant is still valid/active if needed
        // const restaurant = await ctx.db.get(qr.restaurantId);
        // if (!restaurant) return { isValid: false, error: "Restaurant not found" };

        return { isValid: true, data: qr };
    },
});
