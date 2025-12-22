/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import clsx from "clsx";
import { Clock, Volume2, Printer } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
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

    // Printer Logic
    const [isAutoPrintEnabled, setIsAutoPrintEnabled] = useState(false);
    const [printedOrderIds, setPrintedOrderIds] = useState<string[]>([]);
    const [activePrintOrder, setActivePrintOrder] = useState<any>(null);
    const [printQueue, setPrintQueue] = useState<any[]>([]);
    const isPrinting = useRef(false);

    // Load Printer Settings from LocalStorage
    useEffect(() => {
        const savedAutoPrint = localStorage.getItem("kitchen_auto_print");
        if (savedAutoPrint) setIsAutoPrintEnabled(JSON.parse(savedAutoPrint));

        const savedPrintedIds = localStorage.getItem("kitchen_printed_ids");
        if (savedPrintedIds) setPrintedOrderIds(JSON.parse(savedPrintedIds));
    }, []);

    // Save Printer Settings
    useEffect(() => {
        localStorage.setItem("kitchen_auto_print", JSON.stringify(isAutoPrintEnabled));
    }, [isAutoPrintEnabled]);

    useEffect(() => {
        localStorage.setItem("kitchen_printed_ids", JSON.stringify(printedOrderIds));
    }, [printedOrderIds]);

    const pendingOrders = orders?.filter((o: any) => o.status === "pending") || [];
    const preparingOrders = orders?.filter((o: any) => o.status === "preparing") || [];
    const readyOrders = orders?.filter((o: any) => o.status === "ready") || [];

    // Audio Alert Effect
    useEffect(() => {
        if (orders) {
            const currentPendingCount = pendingOrders.length;
            if (currentPendingCount > prevPendingCount.current && audioEnabled) {
                playSound();
            }
            prevPendingCount.current = currentPendingCount;
        }
    }, [orders, pendingOrders.length, audioEnabled, playSound]);

    // Auto-Print Logic: Add new orders to queue
    useEffect(() => {
        if (!orders || !isAutoPrintEnabled) return;

        const newOrders = pendingOrders.filter((order: any) => !printedOrderIds.includes(order._id));

        // Find orders that are NOT in the queue and NOT printed
        const uniqueNewOrders = newOrders.filter((newOrder: any) =>
            !printQueue.some(qOrder => qOrder._id === newOrder._id)
        );

        if (uniqueNewOrders.length > 0) {
            setPrintQueue(prev => [...prev, ...uniqueNewOrders]);
        }
    }, [orders, isAutoPrintEnabled, printedOrderIds, pendingOrders, printQueue]);

    // Process Print Queue
    const processQueue = useCallback(() => {
        if (isPrinting.current || printQueue.length === 0) return;

        const orderToPrint = printQueue[0];
        isPrinting.current = true;
        setActivePrintOrder(orderToPrint);

        // Allow DOM to update then print
        setTimeout(() => {
            window.print();

            // Cleanup after print dialog logic presumably finishes
            // Note: window.print() blocks JS execution in many browsers until closed,
            // but in some it doesn't. We'll handle cleanup safely.

            // We use a slight delay or 'afterprint' event if we want to be strict,
            // but a timeout is usually sufficient for the React state cycle.
        }, 100);

        // We need to wait for the user to close the print dialog
        const cleanup = () => {
            setPrintedOrderIds(prev => [...prev, orderToPrint._id]);
            setPrintQueue(prev => prev.slice(1));
            setActivePrintOrder(null);
            isPrinting.current = false;
            window.removeEventListener('afterprint', cleanup);
        };

        window.addEventListener('afterprint', cleanup);

        // Fallback cleanup if afterprint isn't supported/reliable everywhere
        // (though modern browsers support it well)
    }, [printQueue]);

    useEffect(() => {
        processQueue();
    }, [printQueue, processQueue]);

    const handleManualPrint = (order: any, e: React.MouseEvent) => {
        e.stopPropagation();
        if (isPrinting.current) return;

        // Prioritize manual print: Add to FRONT of queue if not already there,
        // or just force it immediately
        isPrinting.current = true;
        setActivePrintOrder(order);

        setTimeout(() => {
            window.print();
        }, 100);

        const cleanup = () => {
            // For manual print, we don't necessarily need to track it as 'printed' for auto-print logic,
            // but it doesn't hurt to add it to avoid future auto-prints of the same one.
            if (!printedOrderIds.includes(order._id)) {
                setPrintedOrderIds(prev => [...prev, order._id]);
            }
            setActivePrintOrder(null);
            isPrinting.current = false;
            window.removeEventListener('afterprint', cleanup);
        };
        window.addEventListener('afterprint', cleanup);
    };


    if (restaurant === undefined || orders === undefined) {
        return <div className="p-8 text-center text-white">Loading KDS...</div>;
    }

    if (restaurant === null) {
        return <div className="p-8 text-center text-red-500">Restaurant not found.</div>;
    }

    // Security check
    const isSuspended = restaurant?.subscriptionStatus === "suspended";
    const isExpired = restaurant?.subscriptionExpiresAt && Date.now() > restaurant.subscriptionExpiresAt;

    if (isSuspended || isExpired) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6 text-center">
                <div className="max-w-md space-y-4">
                    <div className="w-16 h-16 bg-red-900 rounded-full flex items-center justify-center mx-auto text-3xl">🚫</div>
                    <h1 className="text-2xl font-bold text-white">Restaurant Unavailable</h1>
                    <p className="text-gray-400">
                        This restaurant's subscription {isSuspended ? 'has been suspended' : 'has expired'}.
                        Please contact the restaurant owner to resolve this issue.
                    </p>
                </div>
            </div>
        );
    }

    const handleStatusUpdate = async (orderId: any, newStatus: "pending" | "preparing" | "ready" | "served" | "paid") => {
        await updateStatus({ orderId, status: newStatus });
    };

    const PrintableOrder = ({ order }: { order: any }) => {
        if (!order) return null;
        return (
            <div className="hidden print:block p-4 text-black bg-white w-full max-w-[80mm] mx-auto font-mono text-sm">
                <div className="text-center border-b-2 border-black pb-2 mb-2">
                    <h1 className="text-xl font-bold uppercase">{restaurant.name}</h1>
                    <p className="text-xs">{new Date(order._creationTime).toLocaleString()}</p>
                    <h2 className="text-2xl font-bold mt-2">TABLE {order.table?.number}</h2>
                    <p className="text-xs">Order #{order._id.slice(-6)}</p>
                </div>

                <div className="space-y-4 mb-4">
                    {order.items.map((item: any, idx: number) => (
                        <div key={idx} className="border-b border-dashed border-gray-400 pb-2">
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-lg">{item.quantity}x</span>
                                <span className="flex-1 px-2 font-bold text-lg">{item.menuItem?.name}</span>
                            </div>
                            {item.notes && (
                                <div className="mt-1 text-xs font-bold uppercase p-1 border border-black inline-block">
                                    NOTE: {item.notes}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="text-center text-2xl font-bold mt-4 border-t-2 border-black pt-2">
                    END OF TICKET
                </div>
            </div>
        );
    };

    const OrderCard = ({ order, nextStatus, nextLabel, isNew }: { order: any, nextStatus?: "preparing" | "ready", nextLabel?: string, isNew?: boolean }) => (
        <div
            className={clsx(
                "bg-gray-800 rounded-lg p-4 mb-4 cursor-pointer transition-all hover:bg-gray-700 border-2 relative group",
                isNew ? "border-red-500 animate-pulse" : "border-gray-700"
            )}
            onClick={() => nextStatus && handleStatusUpdate(order._id, nextStatus)}
        >
            <button
                onClick={(e) => handleManualPrint(order, e)}
                className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-full text-gray-300 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10"
                title="Print Order"
            >
                <Printer size={16} />
            </button>

            <div className="flex justify-between items-start mb-2 pr-8">
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
        <div className="h-screen flex flex-col relative print:p-0 print:h-auto print:overflow-visible bg-gray-900">
            {/* Print Overlay */}
            <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-0 font-mono text-black">
                <PrintableOrder order={activePrintOrder} />
            </div>

            {/* Main Application - Hidden when printing */}
            <div className="h-full flex flex-col p-4 gap-4 print:hidden">
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

                    <div className="flex items-center gap-6">
                        {/* Auto Print Toggle */}
                        <div
                            className="flex items-center gap-3 cursor-pointer bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-750"
                            onClick={() => setIsAutoPrintEnabled(!isAutoPrintEnabled)}
                        >
                            <div className={clsx(
                                "w-10 h-6 rounded-full relative transition-colors",
                                isAutoPrintEnabled ? "bg-blue-500" : "bg-gray-600"
                            )}>
                                <div className={clsx(
                                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                                    isAutoPrintEnabled ? "left-5" : "left-1"
                                )} />
                            </div>
                            <div className="flex flex-col">
                                <span className={clsx("text-sm font-bold", isAutoPrintEnabled ? "text-blue-400" : "text-gray-400")}>Auto-Print</span>
                                <span className="text-xs text-gray-500">{isAutoPrintEnabled ? "ON" : "OFF"}</span>
                            </div>
                            <Printer className={clsx("w-5 h-5 ml-1", isAutoPrintEnabled ? "text-blue-400" : "text-gray-500")} />
                        </div>

                        <div className="flex gap-4 text-sm font-medium">
                            <span className="text-red-400">{pendingOrders.length} New</span>
                            <span className="text-blue-400">{preparingOrders.length} Preparing</span>
                            <span className="text-green-400">{readyOrders.length} Ready</span>
                        </div>
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
        </div>
    );
}

