/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Bell, CheckCircle2, Trash2, Utensils, Volume2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import clsx from "clsx";

import { useLanguage } from "@/contexts/LanguageContext";

export default function WaiterPage() {
    // Hardcoded slug for demo
    const restaurantSlug = "burger-bistro";
    const restaurant = useQuery(api.restaurants.getRestaurantBySlug, { slug: restaurantSlug }) as any;
    const { t } = useLanguage();

    const waiterCalls = useQuery(api.waiterCalls.getWaiterCallsByRestaurant,
        restaurant ? { restaurantId: restaurant._id, status: "pending" } : "skip"
    ) as any;

    const readyOrders = useQuery(api.orders.getOrdersByRestaurant,
        restaurant ? { restaurantId: restaurant._id, status: "ready" } : "skip"
    ) as any;

    const tables = useQuery(api.tables.getTablesByRestaurant,
        restaurant ? { restaurantId: restaurant._id } : "skip"
    ) as any;

    const approvalOrders = useQuery(api.orders.getOrdersByRestaurant,
        restaurant ? { restaurantId: restaurant._id, status: "needs_approval" } : "skip"
    ) as any;

    const resolveCall = useMutation(api.waiterCalls.resolveWaiterCall);
    const updateOrderStatus = useMutation(api.orders.updateOrderStatus);
    const updateTableStatus = useMutation(api.tables.updateTableStatus);
    const approveOrder = useMutation(api.approvals.approveOrder);
    const rejectOrder = useMutation(api.approvals.rejectOrder);

    // Audio Logic
    const [audioEnabled, setAudioEnabled] = useState(false);
    const playSound = useNotificationSound("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"); // Using same alert for now, or could use a chime
    const prevCallCount = useRef(0);
    const prevApprovalCount = useRef(0);

    useEffect(() => {
        if (waiterCalls) {
            const currentCallCount = waiterCalls.length;
            if (currentCallCount > prevCallCount.current && audioEnabled) {
                playSound();
            }
            prevCallCount.current = currentCallCount;
        }

        if (approvalOrders) {
            const currentApprovalCount = approvalOrders.length;
            if (currentApprovalCount > prevApprovalCount.current && audioEnabled) {
                playSound();
            }
            prevApprovalCount.current = currentApprovalCount;
        }
    }, [waiterCalls, approvalOrders, audioEnabled, playSound]);

    if (!restaurant || !waiterCalls || !readyOrders || !tables || !approvalOrders) {
        return <div className="p-8 text-center">Loading Waiter Dashboard...</div>;
    }

    // Security check: Suspended or Expired
    const isSuspended = restaurant?.subscriptionStatus === "suspended";
    const isExpired = restaurant?.subscriptionExpiresAt && Date.now() > restaurant.subscriptionExpiresAt;

    if (isSuspended || isExpired) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6 text-center">
                <div className="max-w-md space-y-4">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-3xl">🚫</div>
                    <h1 className="text-2xl font-bold text-gray-900">Restaurant Unavailable</h1>
                    <p className="text-gray-600">
                        This restaurant's subscription {isSuspended ? 'has been suspended' : 'has expired'}.
                        Please contact the restaurant owner to resolve this issue.
                    </p>
                </div>
            </div>
        );
    }

    const dirtyTables = tables.filter((t: any) => t.status === "dirty");

    return (
        <div className="max-w-md mx-auto min-h-screen bg-gray-100 pb-20 relative">
            {/* Audio Enable Overlay */}
            {!audioEnabled && (
                <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-2xl text-center max-w-xs shadow-2xl">
                        <Volume2 className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Enable Alerts</h2>
                        <p className="text-gray-500 mb-6 text-sm">
                            Tap to enable sound notifications for new service calls.
                        </p>
                        <button
                            onClick={() => setAudioEnabled(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-colors w-full"
                        >
                            Enable Audio
                        </button>
                    </div>
                </div>
            )}
            <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-indigo-600" />
                    Waiter Dashboard
                </h1>
            </header>

            <main className="p-4 space-y-8">
                {/* 1. PENDING APPROVALS (Highest Priority) */}
                {approvalOrders.length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-2 animate-pulse">
                            <Bell className="w-4 h-4" />
                            {t("needs_approval")} ({approvalOrders.length})
                        </h2>

                        <div className="space-y-3">
                            {approvalOrders.map((order: any) => (
                                <div key={order._id} className="bg-white border-l-4 border-indigo-500 p-4 rounded-r-xl shadow-lg ring-1 ring-indigo-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="text-2xl font-bold text-gray-900">{t("table_no")} {order.table?.number}</div>
                                        <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded-full">
                                            #{order._id.slice(-4)}
                                        </span>
                                    </div>
                                    <div className="space-y-1 mb-4 border-b border-gray-100 pb-3">
                                        {order.items.map((item: any, idx: number) => (
                                            <div key={idx} className="text-gray-700 flex gap-2 text-sm">
                                                <span className="font-bold">{item.quantity}x</span>
                                                <span>{item.menuItem?.name}</span>
                                                {item.modifiers && item.modifiers.length > 0 && (
                                                    <span className="text-xs text-gray-500 ml-1">
                                                        ({item.modifiers.map((m: any) => `+${m.name} (x${m.quantity})`).join(", ")})
                                                    </span>
                                                )}
                                                {item.notes && (
                                                    <span className="text-xs text-red-500 italic block w-full mt-1">
                                                        "{item.notes}"
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                        <div className="font-bold text-gray-900 mt-2">{t("total")}: {restaurant.currency} {order.totalAmount.toFixed(2)}</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => rejectOrder({ orderId: order._id })}
                                            className="bg-red-50 text-red-700 hover:bg-red-100 py-2 rounded-lg font-bold text-sm transition-colors border border-red-200"
                                        >
                                            {t("reject")}
                                        </button>
                                        <button
                                            onClick={() => approveOrder({ orderId: order._id })}
                                            className="bg-indigo-600 text-white hover:bg-indigo-700 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm"
                                        >
                                            {t("approve")}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 2. SERVICE CALLS */}
                <section>
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        Service Calls ({waiterCalls.length})
                    </h2>

                    <div className="space-y-3">
                        {waiterCalls.length === 0 && (
                            <div className="text-center py-8 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                                No active calls
                            </div>
                        )}
                        {waiterCalls.map((call: any) => (
                            <div
                                key={call._id}
                                onClick={() => resolveCall({ callId: call._id })}
                                className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex justify-between items-center cursor-pointer active:scale-95 transition-transform"
                            >
                                <div>
                                    <div className="text-2xl font-bold text-red-900">Table {call.table?.number}</div>
                                    <div className="text-red-700 font-medium capitalize flex items-center gap-2">
                                        {call.type === 'water' && '💧 Water Requested'}
                                        {call.type === 'bill' && '💳 Bill Requested'}
                                        {call.type === 'help' && '🛎️ Assistance Needed'}
                                    </div>
                                </div>
                                <div className="bg-white p-2 rounded-full shadow-sm">
                                    <CheckCircle2 className="w-6 h-6 text-red-500" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 3. READY TO SERVE */}
                <section>
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Utensils className="w-4 h-4" />
                        Ready to Serve ({readyOrders.length})
                    </h2>

                    <div className="space-y-3">
                        {readyOrders.length === 0 && (
                            <div className="text-center py-8 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                                No orders ready
                            </div>
                        )}
                        {readyOrders.map((order: any) => (
                            <div
                                key={order._id}
                                onClick={() => updateOrderStatus({ orderId: order._id, status: "served" })}
                                className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-sm cursor-pointer active:scale-95 transition-transform"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="text-2xl font-bold text-green-900">Table {order.table?.number}</div>
                                    <span className="bg-green-200 text-green-800 text-xs font-bold px-2 py-1 rounded-full">
                                        #{order._id.slice(-4)}
                                    </span>
                                </div>
                                <div className="space-y-1 mb-3">
                                    {order.items.map((item: any, idx: number) => (
                                        <div key={idx} className="flex flex-col mb-1">
                                            <div className="text-green-800 flex gap-2">
                                                <span className="font-bold">{item.quantity}x</span>
                                                <span>{item.menuItem?.name}</span>
                                            </div>
                                            {item.modifiers && item.modifiers.length > 0 && (
                                                <span className="text-xs text-green-600 ml-6">
                                                    {item.modifiers.map((m: any) => `+${m.name} (x${m.quantity})`).join(", ")}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center justify-center bg-green-600 text-white py-2 rounded-lg font-bold shadow-sm">
                                    Mark Served
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 4. CLEAR TABLES */}
                <section>
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Trash2 className="w-4 h-4" />
                        Clear Tables ({dirtyTables.length})
                    </h2>

                    <div className="grid grid-cols-2 gap-3">
                        {dirtyTables.length === 0 && (
                            <div className="col-span-2 text-center py-8 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                                All tables clean
                            </div>
                        )}
                        {dirtyTables.map((table: any) => (
                            <button
                                key={table._id}
                                onClick={() => updateTableStatus({ tableId: table._id, status: "free" })}
                                className="bg-yellow-50 border-2 border-yellow-400 p-4 rounded-xl shadow-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform h-32"
                            >
                                <span className="text-3xl font-bold text-yellow-900">Table {table.number}</span>
                                <span className="text-yellow-700 font-medium text-sm">Mark Free</span>
                            </button>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
