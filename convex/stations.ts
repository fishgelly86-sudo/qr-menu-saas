import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getRestaurant } from "./restaurants";

// Get all stations for a restaurant
export const getStations = query({
    args: { restaurantId: v.id("restaurants") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("stations")
            .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
            .collect();
    },
});

// Create a new station
export const createStation = mutation({
    args: {
        restaurantId: v.id("restaurants"),
        name: v.string(),
        isDefault: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        // If setting as default, unset others? Not strictly necessary if we just use ID
        // But maybe good for UI convenience.

        // Check permissions (omitted for brevity, assuming authorized context wrapper usually)

        return await ctx.db.insert("stations", {
            restaurantId: args.restaurantId,
            name: args.name,
            isDefault: args.isDefault,
        });
    },
});

// Update a station
export const updateStation = mutation({
    args: {
        stationId: v.id("stations"),
        name: v.optional(v.string()),
        isDefault: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { stationId, ...fields } = args;
        await ctx.db.patch(stationId, fields);
    },
});

// Delete a station
export const deleteStation = mutation({
    args: { stationId: v.id("stations") },
    handler: async (ctx, args) => {
        // Optional: Check if categories use this station?
        // For now, just allow delete. Categories will have dangling ID or checked at UI level.
        await ctx.db.delete(args.stationId);
    },
});
