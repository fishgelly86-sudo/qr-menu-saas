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

    const updateBatchStatus = useMutation(api.orders.updateBatchOrderStatus);

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

    // Mobile Tab State
    const [activeTab, setActiveTab] = useState<"new" | "preparing" | "ready">("new");

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

    // Grouping Logic
    // 1. Filter active orders (not paid, cancelled, or served - served usually means done in KDS flow)
    // Actually, "ready" means ready for pickup. "served" means customer has it.
    // We only show pending, preparing, ready.
    const activeOrders = orders?.filter((o: any) =>
        ["pending", "preparing", "ready"].includes(o.status)
    ) || [];

    // 2. Group by Table ID
    const groupedOrders: Record<string, any[]> = {};
    activeOrders.forEach((o: any) => {
        const key = o.tableId;
        if (!groupedOrders[key]) groupedOrders[key] = [];
        groupedOrders[key].push(o);
    });

    // 3. Determine Group Status
    // Priority: Pending > Preparing > Ready
    // If ANY item is pending, group is "New"
    // Else if ANY item is preparing, group is "Preparing"
    // Else (all ready), group is "Ready"
    const groups = Object.entries(groupedOrders).map(([tableId, groupOrders]) => {
        const hasPending = groupOrders.some(o => o.status === "pending");
        const hasPreparing = groupOrders.some(o => o.status === "preparing");

        let status = "ready";
        if (hasPending) status = "pending";
        else if (hasPreparing) status = "preparing";

        // Sort orders by time? or keep as is.
        // We want the table info.
        const table = groupOrders[0].table;

        return {
            tableId,
            table,
            status,
            orders: groupOrders.sort((a, b) => a._creationTime - b._creationTime)
        };
    });

    const pendingGroups = groups.filter(g => g.status === "pending");
    const preparingGroups = groups.filter(g => g.status === "preparing");
    const readyGroups = groups.filter(g => g.status === "ready");

    const pendingOrders = activeOrders.filter((o: any) => o.status === "pending");

    // Audio Alert Effect (Trigger on new pending ORDERS, not groups, to catch additions)
    useEffect(() => {
        if (orders) {
            const currentPendingCount = pendingOrders.length;
            if (currentPendingCount > prevPendingCount.current && audioEnabled) {
                playSound();
            }
            prevPendingCount.current = currentPendingCount;
        }
    }, [orders, pendingOrders.length, audioEnabled, playSound]);

    // Auto-Print Logic (Keep per-order logic for tickets)
    useEffect(() => {
        if (!orders || !isAutoPrintEnabled) return;

        const newOrders = pendingOrders.filter((order: any) => !printedOrderIds.includes(order._id));
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

        setTimeout(() => {
            window.print();
        }, 100);

        const cleanup = () => {
            setPrintedOrderIds(prev => [...prev, orderToPrint._id]);
            setPrintQueue(prev => prev.slice(1));
            setActivePrintOrder(null);
            isPrinting.current = false;
            window.removeEventListener('afterprint', cleanup);
        };

        window.addEventListener('afterprint', cleanup);
    }, [printQueue]);

    useEffect(() => {
        processQueue();
    }, [printQueue, processQueue]);

    const handleManualPrint = (order: any, e: React.MouseEvent) => {
        e.stopPropagation();
        if (isPrinting.current) return;
        isPrinting.current = true;
        setActivePrintOrder(order);

        setTimeout(() => {
            window.print();
        }, 100);

        const cleanup = () => {
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

    const isSuspended = restaurant?.subscriptionStatus === "suspended";
    const isExpired = restaurant?.subscriptionExpiresAt && Date.now() > restaurant.subscriptionExpiresAt;

    if (isSuspended || isExpired) {
        return <div className="p-8 text-center text-red-500">Restaurant Unavailable</div>;
    }

    // Batch Update Handler
    const handleGroupAction = async (group: any, action: "start_cooking" | "mark_ready" | "serve") => {
        // Collect IDs of orders that need updating
        let targetStatus: "preparing" | "ready" | "served" | "paid" = "preparing";
        let ordersToUpdate: any[] = [];

        if (action === "start_cooking") {
            targetStatus = "preparing";
            ordersToUpdate = group.orders.filter((o: any) => o.status === "pending");
        } else if (action === "mark_ready") {
            targetStatus = "ready";
            ordersToUpdate = group.orders.filter((o: any) => o.status === "preparing");
        } else if (action === "serve") {
            targetStatus = "served"; // Or paid, depending on workflow, usually KDS does Served
            ordersToUpdate = group.orders.filter((o: any) => o.status === "ready");
        }

        const ids = ordersToUpdate.map(o => o._id);
        if (ids.length > 0) {
            await updateBatchStatus({ orderIds: ids, status: targetStatus });
        }
    };

    const PrintableOrder = ({ order }: { order: any }) => {
        // ... (Keep existing printable order logic as it prints per ticket/order)
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

    const OrderGroupCard = ({ group, actionLabel, onAction, isNew }: { group: any, actionLabel?: string, onAction?: () => void, isNew?: boolean }) => {
        // Find the "primary" timestamp (earliest)
        const startTime = group.orders[0]._creationTime;

        return (
            <div
                className={clsx(
                    "bg-gray-800 rounded-lg p-4 mb-4 transition-all hover:bg-gray-700 border-2 relative group",
                    isNew ? "border-red-500" : "border-gray-700"
                )}
            >
                <div className="flex justify-between items-start mb-2 border-b border-gray-700 pb-2">
                    <div>
                        <span className="text-2xl font-bold text-gray-200">Table {group.table?.number}</span>
                        <div className="text-xs text-gray-400">{group.orders.length} Tickets</div>
                    </div>
                    <span className="text-sm text-gray-400">{new Date(startTime).toLocaleTimeString()}</span>
                </div>

                <div className="space-y-4 mb-4">
                    {group.orders.map((order: any) => (
                        <div key={order._id} className="relative pl-3 border-l-2 border-gray-600">
                            {/* Individual Print Button */}
                            <button
                                onClick={(e) => handleManualPrint(order, e)}
                                className="absolute top-0 right-0 p-1 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Print Ticket"
                            >
                                <Printer size={14} />
                            </button>

                            <div className="text-xs text-gray-500 mb-1">Ticket #{order._id.slice(-4)} • {order.status}</div>
                            {order.items.map((item: any, idx: number) => (
                                <div key={idx} className="mb-2 last:mb-0">
                                    <div className="flex items-start gap-2">
                                        <span className={clsx("text-lg font-bold", order.status === "pending" ? "text-white" : "text-gray-400")}>{item.quantity}x</span>
                                        <span className={clsx("text-lg font-medium", order.status === "pending" ? "text-gray-200" : "text-gray-500")}>{item.menuItem?.name}</span>
                                    </div>
                                    {item.notes && (
                                        <div className="mt-1 bg-yellow-900/30 text-yellow-300 p-1 rounded text-sm font-bold border border-yellow-600/30 inline-block">
                                            {item.notes}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {actionLabel && onAction && (
                    <button
                        onClick={onAction}
                        className="w-full mt-2 text-center bg-gray-700 hover:bg-gray-600 py-3 rounded text-gray-200 font-bold uppercase tracking-wider text-sm transition-colors"
                    >
                        {actionLabel}
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="h-screen flex flex-col relative print:p-0 print:h-auto print:overflow-visible bg-gray-900">
            {/* Print Overlay */}
            <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-0 font-mono text-black">
                <PrintableOrder order={activePrintOrder} />
            </div>

            {/* Main Application */}
            <div className="h-full flex flex-col p-4 gap-4 print:hidden">
                {!audioEnabled && (
                    <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center backdrop-blur-sm">
                        <div className="bg-gray-800 p-8 rounded-2xl text-center max-w-md border border-gray-700 shadow-2xl">
                            <Volume2 className="w-16 h-16 text-blue-500 mx-auto mb-6" />
                            <h2 className="text-2xl font-bold text-white mb-2">Enable Kitchen Audio</h2>
                            <button
                                onClick={() => setAudioEnabled(true)}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-colors w-full text-lg mt-4"
                            >
                                Start Shift & Enable Audio
                            </button>
                        </div>
                    </div>
                )}

                <header className="flex justify-between items-center mb-2">
                    <h1 className="text-2xl font-bold text-white">Kitchen Display System (Group View)</h1>

                    <div className="flex items-center gap-6">
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
                        </div>

                        <div className="flex gap-4 text-sm font-medium">
                            <span className="text-red-400">{pendingGroups.length} New Tables</span>
                            <span className="text-blue-400">{preparingGroups.length} Preparing Tables</span>
                            <span className="text-green-400">{readyGroups.length} Ready Tables</span>
                        </div>
                    </div>
                </header>

                {/* Mobile Tab Navigation */}
                <div className="flex md:hidden gap-2 mb-4">
                    <button
                        onClick={() => setActiveTab("new")}
                        className={clsx(
                            "flex-1 py-3 rounded-lg font-bold text-sm uppercase transition-colors flex items-center justify-center gap-2",
                            activeTab === "new" ? "bg-red-600/20 text-red-500 border border-red-500/50" : "bg-gray-800 text-gray-500 hover:bg-gray-700"
                        )}
                    >
                        New
                        <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingGroups.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("preparing")}
                        className={clsx(
                            "flex-1 py-3 rounded-lg font-bold text-sm uppercase transition-colors flex items-center justify-center gap-2",
                            activeTab === "preparing" ? "bg-blue-600/20 text-blue-500 border border-blue-500/50" : "bg-gray-800 text-gray-500 hover:bg-gray-700"
                        )}
                    >
                        Prep
                        <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">{preparingGroups.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("ready")}
                        className={clsx(
                            "flex-1 py-3 rounded-lg font-bold text-sm uppercase transition-colors flex items-center justify-center gap-2",
                            activeTab === "ready" ? "bg-green-600/20 text-green-500 border border-green-500/50" : "bg-gray-800 text-gray-500 hover:bg-gray-700"
                        )}
                    >
                        Ready
                        <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">{readyGroups.length}</span>
                    </button>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden">
                    {/* NEW / PENDING */}
                    <div className={clsx(
                        "flex flex-col bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden",
                        activeTab !== "new" && "hidden md:flex"
                    )}>
                        <div className="bg-red-900/20 p-3 border-b border-red-900/30 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-red-500">NEW ORDERS</h2>
                            <Clock className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="flex-1 overflow-y-auto p-3">
                            {pendingGroups.map((group) => (
                                <OrderGroupCard
                                    key={group.tableId}
                                    group={group}
                                    actionLabel="Start Cooking"
                                    onAction={() => handleGroupAction(group, "start_cooking")}
                                    isNew={true}
                                />
                            ))}
                            {pendingGroups.length === 0 && (
                                <div className="text-center text-gray-600 mt-10">No new orders</div>
                            )}
                        </div>
                    </div>

                    {/* PREPARING */}
                    <div className={clsx(
                        "flex flex-col bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden",
                        activeTab !== "preparing" && "hidden md:flex"
                    )}>
                        <div className="bg-blue-900/20 p-3 border-b border-blue-900/30 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-blue-500">PREPARING</h2>
                            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                        </div>
                        <div className="flex-1 overflow-y-auto p-3">
                            {preparingGroups.map((group) => (
                                <OrderGroupCard
                                    key={group.tableId}
                                    group={group}
                                    actionLabel="Mark Ready"
                                    onAction={() => handleGroupAction(group, "mark_ready")}
                                />
                            ))}
                            {preparingGroups.length === 0 && (
                                <div className="text-center text-gray-600 mt-10">Nothing cooking</div>
                            )}
                        </div>
                    </div>

                    {/* READY */}
                    <div className={clsx(
                        "flex flex-col bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden",
                        activeTab !== "ready" && "hidden md:flex"
                    )}>
                        <div className="bg-green-900/20 p-3 border-b border-green-900/30 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-green-500">READY FOR PICKUP</h2>
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                        </div>
                        <div className="flex-1 overflow-y-auto p-3">
                            {readyGroups.map((group) => (
                                <OrderGroupCard
                                    key={group.tableId}
                                    group={group}
                                    // Action here could be "Served" if we want to remove it manually
                                    // But usually waiter picks it up.
                                    // We can add "Mark Served" to clear it.
                                    actionLabel="Mark Served (Clear)"
                                    onAction={() => handleGroupAction(group, "serve")}
                                />
                            ))}
                            {readyGroups.length === 0 && (
                                <div className="text-center text-gray-600 mt-10">No orders ready</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

