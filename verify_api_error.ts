
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const API_URL = "http://localhost:3000/api/orders";

async function verifyApiError() {
    console.log("--- API Verification Script Started ---");

    // 1. Setup: Get Restaurant and Item
    const restaurants = await client.query(api.superAdmin.listRestaurants);
    const restaurant = restaurants.find(r => r.name === "Burger Bistro") || restaurants[0];
    if (!restaurant) throw new Error("No restaurant found");

    console.log(`Using Restaurant: ${restaurant.name} (${restaurant._id})`);

    const categories = await client.query(api.categories.getCategoriesByRestaurant, { restaurantId: restaurant._id });
    const category = categories[0];
    const menuItems = await client.query(api.menuItems.getMenuItemsByCategory, { categoryId: category._id });
    const item = menuItems[0];
    if (!item) throw new Error("No menu items found");

    console.log(`Using Item: ${item.name} (${item._id})`);

    // 2. Test Case 1: Invalid Table Number
    console.log("\nTest 1: Invalid Table Number");
    const sessionId = uuidv4();
    const payloadInvalidTable = {
        restaurantId: restaurant._id,
        tableNumber: "INVALID_999",
        sessionId: sessionId,
        items: [{ menuItemId: item._id, quantity: 1 }]
    };

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloadInvalidTable)
        });
        const data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log(`Response:`, data);
    } catch (e) {
        console.error("Fetch failed:", e.message);
    }

    // 3. Test Case 2: Valid Table
    const tables = await client.query(api.tables.getTablesByRestaurant, { restaurantId: restaurant._id });
    const table = tables[0];
    if (!table) throw new Error("No tables found");

    // Ensure session exists
    const sessionRes = await client.mutation(api.sessions.createTableSession, {
        restaurantId: restaurant._id,
        tableNumber: table.number,
        sessionId: sessionId
    });
    const activeSessionId = sessionRes.sessionId;
    console.log(`Active Session ID: ${activeSessionId}`);

    console.log(`\nTest 2: Valid Table ${table.number}`);
    const payloadValid = {
        restaurantId: restaurant._id,
        tableNumber: table.number,
        sessionId: sessionId,
        items: [{ menuItemId: item._id, quantity: 1 }]
    };

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloadValid)
        });
        const data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log(`Response:`, data);

        // Clean up if successful
        if (data.success && data.orderId) {
            console.log("Order created, cleaning up...");
            await client.mutation(api.orders.updateOrderStatus, {
                orderId: data.orderId,
                status: "cancelled"
            });
        }
    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
}

verifyApiError().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
