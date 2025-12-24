import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { compareSync, hashSync } from "bcryptjs";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { query } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      crypto: {
        hashSecret: async (secret) => hashSync(secret, 12),
        verifySecret: async (plainText, hash) => {
          const isValid = compareSync(plainText, hash);
          console.log(`[DEBUG] verifySecret: Valid=${isValid}`);
          return isValid;
        },
      },
    }),
    Anonymous
  ],
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});
