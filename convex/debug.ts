import { query } from "./_generated/server";
import { getUserId } from "./utils";

export const debugOwnership = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getUserId(ctx);

        const restaurants = await ctx.db.query("restaurants").collect();

        const staffParams = await ctx.db
            .query("staff")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        return {
            myUserId: userId,
            restaurants: restaurants.map(r => ({
                _id: r._id,
                name: r.name,
                slug: r.slug,
                ownerId: r.ownerId,
                isOwner: r.ownerId === userId
            })),
            staffRecords: staffParams
        };
    },
});
