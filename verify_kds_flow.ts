
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function verifyKDSFlow() {
    console.log("--- KDS Verification Script Started ---");

    // 1. Setup: Get Restaurant and Table
    const restaurants = await client.query(api.superAdmin.listRestaurants);
    // Use the first one or a specific one
    const restaurant = restaurants.find(r => r.name === "Burger Bistro") || restaurants[0];
    if (!restaurant) throw new Error("No restaurant found");

    console.log(`Using Restaurant: ${restaurant.name} (${restaurant._id})`);

    const tables = await client.query(api.tables.getTablesByRestaurant, { restaurantId: restaurant._id });
    const table = tables[0];
    if (!table) throw new Error("No tables found");

    console.log(`Using Table: ${table.number} (${table._id})`);

    // 2. Create a Session
    const sessionId = uuidv4();
    console.log(`Creating Session: ${sessionId}`);

    // Check if table is free, if not we might need to free it or just force join
    // For test simplicity, we assume we can create/join.
    try {
        await client.mutation(api.sessions.createTableSession, {
            restaurantId: restaurant._id,
            tableNumber: table.number,
            sessionId: sessionId
        });
    } catch (e: any) {
        console.log("Session creation note (might be joined):", e.message);
    }

    // Get menu item
    // Use getMenuItemsByRestaurant directly since we just need any item
    const menuItems = await client.query(api.menuItems.getMenuItemsByRestaurant, { restaurantId: restaurant._id });
    const item = menuItems[0];
    if (!item) throw new Error("No menu items found");

    console.log(`Using Menu Item: ${item.name}`);

    // 3. Create Order A
    console.log("Creating Order A...");
    const orderAId = await client.mutation(api.orders.createOrder, {
        restaurantId: restaurant._id,
        tableNumber: table.number,
        sessionId: sessionId,
        items: [{ menuItemId: item._id, quantity: 1 }]
    });
    console.log(`Order A Created: ${orderAId}`);

    // 4. Verify Active Orders includes Order A
    let activeOrders = await client.query(api.orders.getOrdersByRestaurant, { restaurantId: restaurant._id });
    // Filter like KDS: pending, preparing, ready
    let kdsOrders = activeOrders.filter((o: any) => ["pending", "preparing", "ready"].includes(o.status));

    if (!kdsOrders.find((o: any) => o._id === orderAId)) {
        throw new Error("Order A not found in KDS active orders (Initial check)");
    }
    console.log("Verified: Order A is visible in KDS.");

    // 5. Pay Order A
    console.log("Marking Order A as PAID...");
    await client.mutation(api.orders.updateOrderStatus, {
        orderId: orderAId,
        status: "paid"
    });

    // 6. Create Order B
    console.log("Creating Order B...");
    const orderBId = await client.mutation(api.orders.createOrder, {
        restaurantId: restaurant._id,
        tableNumber: table.number,
        sessionId: sessionId,
        items: [{ menuItemId: item._id, quantity: 2 }]
    });
    console.log(`Order B Created: ${orderBId}`);

    // 7. Verify Active Orders: Should contain Order B, should NOT contain Order A
    activeOrders = await client.query(api.orders.getOrdersByRestaurant, { restaurantId: restaurant._id });
    kdsOrders = activeOrders.filter((o: any) => ["pending", "preparing", "ready"].includes(o.status));

    const hasOrderA = kdsOrders.some((o: any) => o._id === orderAId);
    const hasOrderB = kdsOrders.some((o: any) => o._id === orderBId);

    console.log(`KDS contains Order A? ${hasOrderA}`);
    console.log(`KDS contains Order B? ${hasOrderB}`);

    if (!hasOrderB) throw new Error("Order B is MISSING from KDS.");
    if (hasOrderA) throw new Error("Order A is STILL in KDS (Should be hidden as Paid).");

    console.log("--- SUCCESS: Verification Passed ---");
    console.log("Order A (Paid) was correctly removed from KDS view.");
    console.log("Order B (New) started a fresh entry.");
}

verifyKDSFlow().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
