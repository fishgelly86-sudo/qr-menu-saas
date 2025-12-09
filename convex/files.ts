import { mutation, action } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

export const getImageUrl = action({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.storageId);
    },
});

export const logImageMetadata = mutation({
    args: {
        storageId: v.string(),
        fileName: v.optional(v.string()),
        originalSize: v.number(),
        compressedSize: v.number(),
        restaurantId: v.optional(v.string()), // Kept loose as string to avoid ID issues if not provided
    },
    handler: async (ctx, args) => {
        // Just a log for now, or could store in a table
        console.log("Image Uploaded:", args);
    },
});
