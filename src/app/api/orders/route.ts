import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // 1. Basic Validation
        if (!body.restaurantId || !body.tableNumber || !body.items || body.items.length === 0) {
            console.error("Validation failed: Missing required fields", body);
            return NextResponse.json(
                { success: false, error: "Missing required fields (restaurantId, tableNumber, or items)" },
                { status: 400 }
            );
        }

        // 2. Call the Convex mutation
        const orderId = await client.mutation(api.orders.createOrder, {
            restaurantId: body.restaurantId,
            tableNumber: body.tableNumber,
            sessionId: body.sessionId,
            items: body.items,
            customerId: body.customerId
        });

        return NextResponse.json({ success: true, orderId });
    } catch (error: any) {
        // 3. Log the full error
        console.error("API Error in POST /api/orders:", error);

        // 4. Determine status code based on error message
        const errorMessage = String(error.message || "");

        const status =
            errorMessage.includes("closed") ? 403 :
                errorMessage.includes("Invalid table") ? 400 :
                    errorMessage.includes("session expired") ? 401 :
                        errorMessage.includes("No active session") ? 401 :
                            errorMessage.includes("Invalid session token") ? 401 : // Added
                                errorMessage.includes("Table is not active") ? 403 :
                                    errorMessage.includes("Cannot place an empty order") ? 400 :
                                        errorMessage.includes("Invalid quantity") ? 400 :
                                            errorMessage.includes("not found") ? 404 :
                                                errorMessage.includes("not available") ? 409 :
                                                    errorMessage.includes("Rate limit") ? 429 :
                                                        errorMessage.includes("Validator error") ? 400 : 500; // Catch validation errors

        return NextResponse.json(
            { success: false, error: errorMessage || "Internal Server Error" },
            { status }
        );
    }
}
