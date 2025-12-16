/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { CheckCircle, Clock, Coffee, DollarSign, Printer, X, Trash2 } from "lucide-react";
import clsx from "clsx";
import { useState } from "react";

export default function AdminDashboard() {
    // Dynamic Restaurant Loading (Support for Login As)
    const [restaurantSlug, setRestaurantSlug] = useState(() => {
        if (typeof window !== 'undefined') {
            const adminSession = localStorage.getItem("admin_session");
            const searchParams = new URLSearchParams(window.location.search);
            if (searchParams.get("from") === "superadmin" && adminSession) {
                try {
                    const session = JSON.parse(adminSession);
                    return session.slug;
                } catch (e) {
                    console.error("Invalid admin session", e);
                }
            }
        }
        return "burger-bistro"; // Fallback to default for demo
    });

    const restaurant = useQuery(api.restaurants.getRestaurantBySlug, { slug: restaurantSlug }) as any;

    const [currentTime, setCurrentTime] = useState(Date.now());

    // Calculate start of today (4 AM)
    const startOfToday = new Date(currentTime);
    startOfToday.setHours(4, 0, 0, 0);
    if (new Date(currentTime).getHours() < 4) {
        startOfToday.setDate(startOfToday.getDate() - 1);
    }
    const minDate = startOfToday.getTime();

    const orders = useQuery(api.orders.getOrdersByRestaurant,
        restaurant ? { restaurantId: restaurant._id } : "skip"
    ) as any;

    const updateStatus = useMutation(api.orders.updateOrderStatus);
    const cancelOrder = useMutation(api.orders.cancelOrder);
    const archiveCompletedOrders = useMutation(api.orders.archiveCompletedOrders);

    if (restaurant === undefined || orders === undefined) {
        return <div className="p-8 text-center">Loading dashboard...</div>;
    }

    if (restaurant === null) {
        return <div className="p-8 text-center text-red-500">Restaurant not found. Please seed data.</div>;
    }

    const handleStatusUpdate = async (orderId: any, newStatus: "pending" | "preparing" | "ready" | "served" | "paid") => {
        await updateStatus({ orderId, status: newStatus });
    };

    const handleCancelOrder = async (orderId: any) => {
        if (confirm("Are you sure you want to cancel this order?")) {
            await cancelOrder({ orderId });
        }
    };

    const handlePrintReceipt = (order: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const receiptHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt - Table ${order.table?.number}</title>
                <style>
                    body { font-family: monospace; padding: 20px; max-width: 400px; margin: 0 auto; }
                    h1 { text-align: center; font-size: 24px; margin-bottom: 10px; }
                    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #000; padding-bottom: 10px; }
                    .items { margin: 20px 0; }
                    .item { display: flex; justify-content: space-between; margin: 8px 0; }
                    .total { border-top: 2px solid #000; margin-top: 20px; padding-top: 10px; font-weight: bold; font-size: 18px; }
                    .footer { text-align: center; margin-top: 20px; border-top: 2px dashed #000; padding-top: 10px; }
                    @media print { button { display: none; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${restaurant.name}</h1>
                    <p>Table: ${order.table?.number}</p>
                    <p>Date: ${new Date(order._creationTime).toLocaleString()}</p>
                    <p>Status: PAID</p>
                </div>
                <div class="items">
                    ${order.items.map((item: any) => `
                        <div class="item">
                            <span>${item.quantity}x ${item.menuItem?.name || 'Unknown Item'}</span>
                            <span>${restaurant.currency} ${(item.menuItem?.price * item.quantity).toFixed(2)}</span>
                        </div>
                        ${item.modifiers ? item.modifiers.map((mod: any) => `
                            <div class="item" style="font-size: 12px; color: #555; padding-left: 20px; margin: 4px 0;">
                                <span>+ ${mod.name || "Extra"} (x${mod.quantity})</span>
                                <span>${mod.price > 0 ? `${restaurant.currency} ${(mod.price * mod.quantity).toFixed(2)}` : ''}</span>
                            </div>
                        `).join('') : ''}
                        ${item.notes ? `<div style="font-size: 12px; color: #555; padding-left: 20px; font-style: italic;">Note: ${item.notes}</div>` : ''}
                    `).join('')}
                </div>
                <div class="total">
                    <div class="item">
                        <span>TOTAL:</span>
                        <span>${restaurant.currency} ${order.totalAmount.toFixed(2)}</span>
                    </div>
                </div>
                <div class="footer">
                    <p>Thank you for dining with us!</p>
                </div>
                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">Print Receipt</button>
                    <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; margin-left: 10px;">Close</button>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(receiptHTML);
        printWindow.document.close();
    };

    const statusColors = {
        pending: "bg-yellow-100 text-yellow-800",
        preparing: "bg-blue-100 text-blue-800",
        ready: "bg-orange-100 text-orange-800",
        served: "bg-green-100 text-green-800",
        paid: "bg-gray-100 text-gray-800",
        cancelled: "bg-red-100 text-red-800",
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900">
                        {restaurant.name} Dashboard
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-500 hidden sm:block">
                            {orders.length} Active Orders
                        </div>
                        <button
                            onClick={async () => {
                                if (confirm("This will hide all Paid and Cancelled orders from the dashboard. They will remain in analytics. Continue?")) {
                                    const result = await archiveCompletedOrders({ restaurantId: restaurant._id });
                                    alert(`Cleared ${result.archivedCount} completed orders.`);
                                }
                            }}
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-md border border-gray-200 transition-colors flex items-center gap-1"
                        >
                            <Trash2 className="w-3 h-3" />
                            Clear Dashboard
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {orders.map((order: any) => (
                        <div key={order._id} className="bg-white overflow-hidden shadow rounded-lg flex flex-col relative group">
                            {/* Cancel Button */}
                            {order.status !== "cancelled" && order.status !== "paid" && (
                                <button
                                    onClick={() => handleCancelOrder(order._id)}
                                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors z-10"
                                    title="Cancel Order"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}

                            <div className="px-4 py-5 sm:p-6 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900">
                                            Table {order.table?.number}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {new Date(order._creationTime).toLocaleTimeString()}
                                        </p>
                                    </div>
                                    <span className={clsx(
                                        "px-2 py-1 text-xs font-medium rounded-full",
                                        statusColors[order.status as keyof typeof statusColors]
                                    )}>
                                        {order.status.toUpperCase()}
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {order.items.map((item: any, idx: number) => (
                                        <div key={idx} className="flex flex-col text-sm border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                                            <div className="flex justify-between">
                                                <div className="flex items-start gap-2">
                                                    <span className="font-medium text-gray-900">{item.quantity}x</span>
                                                    <span className="text-gray-700">{item.menuItem?.name || "Unknown Item"}</span>
                                                </div>
                                                <span className="text-gray-900">
                                                    {restaurant.currency} {(item.menuItem?.price * item.quantity).toFixed(2)}
                                                </span>
                                            </div>
                                            {/* Modifiers */}
                                            {item.modifiers && item.modifiers.length > 0 && (
                                                <div className="pl-6 text-xs text-gray-500 mt-1 space-y-1">
                                                    {item.modifiers.map((mod: any, mIdx: number) => (
                                                        <div key={mIdx} className="flex justify-between">
                                                            <span>+ {mod.name || "Extra"} (x{mod.quantity})</span>
                                                            {mod.price > 0 && (
                                                                <span>{restaurant.currency} {(mod.price * mod.quantity).toFixed(2)}</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {/* Notes */}
                                            {item.notes && (
                                                <p className="pl-6 text-xs text-orange-600 italic mt-1">
                                                    Note: {item.notes}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 pt-4 border-t flex justify-between items-center">
                                    <span className={clsx(
                                        "font-bold text-lg",
                                        order.status === "paid" ? "text-green-600" : "text-black"
                                    )}>
                                        Total: {restaurant.currency} {order.totalAmount.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-gray-50 px-4 py-4 sm:px-6 flex gap-2 justify-end">
                                {order.status === "pending" && (
                                    <button
                                        onClick={() => handleStatusUpdate(order._id, "preparing")}
                                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        <Coffee className="h-4 w-4 mr-1" />
                                        Start Preparing
                                    </button>
                                )}
                                {order.status === "preparing" && (
                                    <button
                                        onClick={() => handleStatusUpdate(order._id, "ready")}
                                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                                    >
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Mark Ready
                                    </button>
                                )}
                                {order.status === "ready" && (
                                    <button
                                        onClick={() => handleStatusUpdate(order._id, "served")}
                                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Serve
                                    </button>
                                )}
                                {order.status === "served" && (
                                    <button
                                        onClick={() => handleStatusUpdate(order._id, "paid")}
                                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                    >
                                        <DollarSign className="h-4 w-4 mr-1" />
                                        Mark Paid
                                    </button>
                                )}
                                {order.status === "paid" && (
                                    <button
                                        onClick={() => handlePrintReceipt(order)}
                                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                        <Printer className="h-4 w-4 mr-1" />
                                        Print Receipt
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {orders.length === 0 && (
                        <div className="col-span-full text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                            <Clock className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No active orders</h3>
                            <p className="mt-1 text-sm text-gray-500">New orders will appear here automatically.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
