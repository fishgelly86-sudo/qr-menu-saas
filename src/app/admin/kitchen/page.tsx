/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import clsx from "clsx";
import { Clock, Volume2, VolumeX } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNotificationSound } from "@/hooks/useNotificationSound";

export default function KitchenPage() {
    // Hardcoded slug for demo
    const restaurantSlug = "burger-bistro";
    const restaurant = useQuery(api.restaurants.getRestaurantBySlug, { slug: restaurantSlug }) as any;

    const orders = useQuery(api.orders.getOrdersByRestaurant,
        restaurant ? { restaurantId: restaurant._id } : "skip"
    ) as any;

    const updateStatus = useMutation(api.orders.updateOrderStatus);

    // Audio Logic
    const [audioEnabled, setAudioEnabled] = useState(false);
    const playSound = useNotificationSound("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"); // Kitchen Alert
    const prevPendingCount = useRef(0);

    const pendingOrders = orders?.filter((o: any) => o.status === "pending") || [];
    const preparingOrders = orders?.filter((o: any) => o.status === "preparing") || [];
    const readyOrders = orders?.filter((o: any) => o.status === "ready") || [];

    useEffect(() => {
        if (orders) {
            const currentPendingCount = pendingOrders.length;
            if (currentPendingCount > prevPendingCount.current && audioEnabled) {
                playSound();
            }
            prevPendingCount.current = currentPendingCount;
        }
    }, [orders, pendingOrders.length, audioEnabled, playSound]);

    if (restaurant === undefined || orders === undefined) {
        return <div className="p-8 text-center text-white">Loading KDS...</div>;
    }

    if (restaurant === null) {
        return <div className="p-8 text-center text-red-500">Restaurant not found.</div>;
    }



    const handleStatusUpdate = async (orderId: any, newStatus: "pending" | "preparing" | "ready" | "served" | "paid") => {
        await updateStatus({ orderId, status: newStatus });
    };

    const OrderCard = ({ order, nextStatus, nextLabel, isNew }: { order: any, nextStatus?: "preparing" | "ready", nextLabel?: string, isNew?: boolean }) => (
        <div
            className={clsx(
                "bg-gray-800 rounded-lg p-4 mb-4 cursor-pointer transition-all hover:bg-gray-700 border-2",
                isNew ? "border-red-500 animate-pulse" : "border-gray-700"
            )}
            onClick={() => nextStatus && handleStatusUpdate(order._id, nextStatus)}
        >
            <div className="flex justify-between items-start mb-2">
                <span className="text-xl font-bold text-gray-200">Table {order.table?.number}</span>
                <span className="text-sm text-gray-400">{new Date(order._creationTime).toLocaleTimeString()}</span>
            </div>

            <div className="space-y-3 mb-4">
                {order.items.map((item: any, idx: number) => (
                    <div key={idx} className="border-b border-gray-700 pb-2 last:border-0">
                        <div className="flex items-start gap-2">
                            <span className="text-2xl font-bold text-white">{item.quantity}x</span>
                            <span className="text-2xl font-medium text-gray-300">{item.menuItem?.name}</span>
                        </div>
                        {item.notes && (
                            <div className="mt-1 bg-yellow-900/50 text-yellow-300 p-2 rounded text-lg font-bold border border-yellow-600/50">
                                NOTE: {item.notes}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {nextStatus && (
                <div className="mt-2 text-center bg-gray-700 py-2 rounded text-gray-300 font-medium uppercase tracking-wider text-sm">
                    Tap to {nextLabel}
                </div>
            )}
        </div>
    );

    return (
        <div className="h-screen flex flex-col p-4 gap-4 relative">
            {/* Audio Enable Overlay */}
            {!audioEnabled && (
                <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-gray-800 p-8 rounded-2xl text-center max-w-md border border-gray-700 shadow-2xl">
                        <Volume2 className="w-16 h-16 text-blue-500 mx-auto mb-6" />
                        <h2 className="text-2xl font-bold text-white mb-2">Enable Kitchen Audio</h2>
                        <p className="text-gray-400 mb-8">
                            To hear new order alerts, the browser requires your permission to play sound.
                        </p>
                        <button
                            onClick={() => setAudioEnabled(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-colors w-full text-lg"
                        >
                            Start Shift & Enable Audio
                        </button>
                    </div>
                </div>
            )}

            <header className="flex justify-between items-center mb-2">
                <h1 className="text-2xl font-bold text-white">Kitchen Display System</h1>
                <div className="flex gap-4 text-sm font-medium">
                    <span className="text-red-400">{pendingOrders.length} New</span>
                    <span className="text-blue-400">{preparingOrders.length} Preparing</span>
                    <span className="text-green-400">{readyOrders.length} Ready</span>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-3 gap-4 overflow-hidden">
                {/* NEW / PENDING */}
                <div className="flex flex-col bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
                    <div className="bg-red-900/20 p-3 border-b border-red-900/30 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-red-500">NEW ORDERS</h2>
                        <Clock className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-1 overflow-y-auto p-3">
                        {pendingOrders.map((order: any) => (
                            <OrderCard
                                key={order._id}
                                order={order}
                                nextStatus="preparing"
                                nextLabel="Start Cooking"
                                isNew={true}
                            />
                        ))}
                        {pendingOrders.length === 0 && (
                            <div className="text-center text-gray-600 mt-10">No new orders</div>
                        )}
                    </div>
                </div>

                {/* PREPARING */}
                <div className="flex flex-col bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
                    <div className="bg-blue-900/20 p-3 border-b border-blue-900/30 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-blue-500">PREPARING</h2>
                        <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                    </div>
                    <div className="flex-1 overflow-y-auto p-3">
                        {preparingOrders.map((order: any) => (
                            <OrderCard
                                key={order._id}
                                order={order}
                                nextStatus="ready"
                                nextLabel="Mark Ready"
                            />
                        ))}
                        {preparingOrders.length === 0 && (
                            <div className="text-center text-gray-600 mt-10">Nothing cooking</div>
                        )}
                    </div>
                </div>

                {/* READY */}
                <div className="flex flex-col bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
                    <div className="bg-green-900/20 p-3 border-b border-green-900/30 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-green-500">READY FOR PICKUP</h2>
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <div className="flex-1 overflow-y-auto p-3">
                        {readyOrders.map((order: any) => (
                            <OrderCard
                                key={order._id}
                                order={order}
                            // No next action for Kitchen, Waiter picks it up
                            />
                        ))}
                        {readyOrders.length === 0 && (
                            <div className="text-center text-gray-600 mt-10">No orders ready</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
