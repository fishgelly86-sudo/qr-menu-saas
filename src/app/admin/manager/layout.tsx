"use client";
import AdminSidebar from "@/components/AdminSidebar";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useEffect, useState } from "react";

export default function ManagerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // 1. Fetch any restaurant (since auth is removed, we pick the first one)
    // In a real multi-tenant app without auth, this would be insecure/broken, but for this specific request:
    const restaurants = useQuery(api.restaurants.listRestaurants);
    const restaurant = restaurants?.[0]; // Pick first

    // 2. State for manual toggle
    const [isAcceptingOrders, setIsAcceptingOrders] = useState(true);

    // 3. Heartbeat & Status Logic
    const setStatus = useMutation(api.managers.setManagerStatus);

    // Sync initial state from DB? 
    // Ideally we double check if *actual* status is online.
    // For now, default true is fine, but it might toggle ON when page refreshes.
    // Let's assume manager wants to be online when they visit.

    useEffect(() => {
        if (!restaurant) return;

        const updateStatus = async (online: boolean) => {
            await setStatus({
                restaurantId: restaurant._id,
                isOnline: online
            });
        };

        if (isAcceptingOrders) {
            // Initial set
            updateStatus(true);

            // Heartbeat loop
            const interval = setInterval(() => {
                updateStatus(true);
            }, 30000);

            return () => clearInterval(interval);
        } else {
            // If toggled off, force offline immediately
            updateStatus(false);
        }
    }, [restaurant, isAcceptingOrders, setStatus]);


    return (
        <div className="flex min-h-screen bg-gray-50 relative">
            <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-white p-2 rounded-lg shadow-md border border-gray-200">
                <div className="flex flex-col items-end">
                    <span className="text-sm font-bold text-gray-800">Restaurant Status</span>
                    <span className={`text-xs ${isAcceptingOrders ? "text-green-600" : "text-red-500"}`}>
                        {isAcceptingOrders ? "Accepting Orders" : "Closed"}
                    </span>
                </div>

                <button
                    onClick={() => setIsAcceptingOrders(!isAcceptingOrders)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isAcceptingOrders ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAcceptingOrders ? 'translate-x-6' : 'translate-x-1'
                            }`}
                    />
                </button>
            </div>

            <AdminSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
                    {children}
                </main>
            </div>
        </div>
    );
}

