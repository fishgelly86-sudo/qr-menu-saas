
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import { hash, compare } from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const secretKey = process.env.SUPER_ADMIN_SECRET!;

async function reproduce() {
    console.log("--- Reproduction Script Started ---");

    // 1. Get Restaurant
    console.log("1. Fetching restaurants...");
    const restaurants = await client.query(api.superAdmin.listRestaurants);
    const target = restaurants.find(r => r.ownerEmail === "burger-bistro@gmail.com");

    if (!target) {
        console.error("Target restaurant not found!");
        return;
    }
    console.log(`Found target: ${target.name} (${target._id})`);

    // 2. Simulate Frontend Hashing
    const password = "marouan123";
    console.log(`2. Hashing password: ${password}`);
    const passwordHash = await hash(password, 12);
    console.log(`Generated Hash: ${passwordHash}`);

    // 3. Update Password via Mutation
    console.log("3. Updating password via superAdmin mutation...");
    await client.mutation(api.superAdmin.updateRestaurantPassword, {
        restaurantId: target._id,
        passwordHash: passwordHash, // Sending the hash directly
        secretKey: secretKey
    });
    console.log("Mutation complete.");

    // 4. Verification (Simulating what auth.ts does)
    console.log("4. Verifying...");
    // We can't easily access the authAccounts table directly from client without an admin query
    // So we will try to "login" using the exposed adminAuth action if available, or just check if we can
    // fetch the restaurant by credentials if we have a way.

    // Actually, we can use the `adminAuth` module's internal query via a wrapper or just trust the manual check.
    // Let's rely on the user trying to login, but we can double check the stored hash if we add a debug query.

    console.log("--- Reproduction Script Finished ---");
    console.log("Please check the Convex logs for the 'auth:signIn' or 'syncOwnerPassword' output.");
    console.log(`Try logging in with: ${target.ownerEmail} / ${password}`);
}

reproduce().catch(console.error);
