import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Additional validation could go here, but we implemented robust checks in the mutation itself.

        // Call the Convex mutation
        const orderId = await client.mutation(api.orders.createOrder, {
            restaurantId: body.restaurantId,
            tableNumber: body.tableNumber,
            sessionId: body.sessionId,
            items: body.items,
            customerId: body.customerId
        });

        return NextResponse.json({ success: true, orderId });
    } catch (error: any) {
        // Determine status code
        const status =
            error.message.includes("closed") ? 403 :
                error.message.includes("Invalid table") ? 400 :
                    error.message.includes("session expired") ? 401 :
                        error.message.includes("No active session") ? 401 :
                            error.message.includes("Table is not active") ? 403 : 500;

        return NextResponse.json(
            { success: false, error: error.message || "Internal Server Error" },
            { status }
        );
    }
}
