import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Public query to validate super admin secret key
 * This doesn't require authentication
 */
export const validateSuperAdminKey = query({
    args: {
        secretKey: v.string(),
    },
    handler: async (ctx, args) => {
        const expectedSecret = process.env.SUPER_ADMIN_SECRET;

        if (!expectedSecret) {
            throw new Error("Super admin secret not configured");
        }

        if (args.secretKey !== expectedSecret) {
            throw new Error("Invalid secret key");
        }

        return {
            success: true,
            message: "Super admin access granted"
        };
    },
});
