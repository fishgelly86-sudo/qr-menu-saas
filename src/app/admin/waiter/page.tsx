/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Bell, CheckCircle2, Trash2, Utensils, Volume2, Edit, X } from "lucide-react";
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

    const menu = useQuery(api.restaurants.getMenu,
        restaurant ? { restaurantSlug } : "skip"
    );

    const resolveCall = useMutation(api.waiterCalls.resolveWaiterCall);
    const updateOrderStatus = useMutation(api.orders.updateOrderStatus);
    const updateTableStatus = useMutation(api.tables.updateTableStatus);
    const approveOrder = useMutation(api.approvals.approveOrder);
    const rejectOrder = useMutation(api.approvals.rejectOrder);
    const updateOrderItems = useMutation(api.orders.updateOrderItems);
    const deleteOrderItem = useMutation(api.orders.deleteOrderItem);

    // Edit order state
    const [editingOrder, setEditingOrder] = useState<any>(null);
    const [editedItems, setEditedItems] = useState<any[]>([]);
    const [expandedItemIdx, setExpandedItemIdx] = useState<number | null>(null);
    const [showAddItem, setShowAddItem] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

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
        return <div className="p-8 text-center">{t("loading_waiter_dashboard")}</div>;
    }

    // Security check: Suspended or Expired
    const isSuspended = restaurant?.subscriptionStatus === "suspended";
    const isExpired = restaurant?.subscriptionExpiresAt && Date.now() > restaurant.subscriptionExpiresAt;

    if (isSuspended || isExpired) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6 text-center">
                <div className="max-w-md space-y-4">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-3xl">🚫</div>
                    <h1 className="text-2xl font-bold text-gray-900">{t("restaurant_unavailable")}</h1>
                    <p className="text-gray-600">
                        {t("subscription_issue_msg", { status: isSuspended ? t('subscription_suspended') : t('subscription_expired') })}
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
                        <h2 className="text-xl font-bold text-gray-900 mb-2">{t("enable_alerts")}</h2>
                        <p className="text-gray-500 mb-6 text-sm">
                            {t("enable_audio_msg")}
                        </p>
                        <button
                            onClick={() => setAudioEnabled(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-colors w-full"
                        >
                            {t("enable_audio")}
                        </button>
                    </div>
                </div>
            )}
            <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-indigo-600" />
                    {t("waiter_dashboard")}
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
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            onClick={() => rejectOrder({ orderId: order._id })}
                                            className="bg-red-50 text-red-700 hover:bg-red-100 py-2 rounded-lg font-bold text-sm transition-colors border border-red-200"
                                        >
                                            {t("reject")}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingOrder(order);
                                                setEditedItems(JSON.parse(JSON.stringify(order.items)));
                                            }}
                                            className="bg-gray-50 text-gray-700 hover:bg-gray-100 py-2 rounded-lg font-bold text-sm transition-colors border border-gray-300 flex items-center justify-center gap-1"
                                        >
                                            <Edit className="w-4 h-4" />
                                            {t("edit_order")}
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
                        {t("service_calls")} ({waiterCalls.length})
                    </h2>

                    <div className="space-y-3">
                        {waiterCalls.length === 0 && (
                            <div className="text-center py-8 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                                {t("no_active_calls")}
                            </div>
                        )}
                        {waiterCalls.map((call: any) => (
                            <div
                                key={call._id}
                                onClick={() => resolveCall({ callId: call._id })}
                                className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex justify-between items-center cursor-pointer active:scale-95 transition-transform"
                            >
                                <div>
                                    <div className="text-2xl font-bold text-red-900">{t("table_no")} {call.table?.number}</div>
                                    <div className="text-red-700 font-medium capitalize flex items-center gap-2">
                                        {call.type === 'water' && t("water_requested")}
                                        {call.type === 'bill' && t("bill_requested")}
                                        {call.type === 'help' && t("assistance_needed")}
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
                        {t("ready_to_serve")} ({readyOrders.length})
                    </h2>

                    <div className="space-y-3">
                        {readyOrders.length === 0 && (
                            <div className="text-center py-8 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                                {t("no_orders_ready")}
                            </div>
                        )}
                        {readyOrders.map((order: any) => (
                            <div
                                key={order._id}
                                onClick={() => updateOrderStatus({ orderId: order._id, status: "served" })}
                                className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-sm cursor-pointer active:scale-95 transition-transform"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="text-2xl font-bold text-green-900">{t("table_no")} {order.table?.number}</div>
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
                                    {t("mark_served")}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 4. CLEAR TABLES */}
                <section>
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Trash2 className="w-4 h-4" />
                        {t("clear_tables")} ({dirtyTables.length})
                    </h2>

                    <div className="grid grid-cols-2 gap-3">
                        {dirtyTables.length === 0 && (
                            <div className="col-span-2 text-center py-8 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                                {t("all_tables_clean")}
                            </div>
                        )}
                        {dirtyTables.map((table: any) => (
                            <button
                                key={table._id}
                                onClick={() => updateTableStatus({ tableId: table._id, status: "free" })}
                                className="bg-yellow-50 border-2 border-yellow-400 p-4 rounded-xl shadow-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform h-32"
                            >
                                <span className="text-3xl font-bold text-yellow-900">{t("table_no")} {table.number}</span>
                                <span className="text-yellow-700 font-medium text-sm">{t("mark_free")}</span>
                            </button>
                        ))}
                    </div>
                </section>
            </main>

            {/* Edit Order Modal */}
            {editingOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
                            <h2 className="text-xl font-bold text-gray-900">{t("edit_order_table", { table: editingOrder.table?.number })}</h2>
                        </div>

                        <div className="p-4 space-y-3">
                            {editedItems.map((item: any, idx: number) => {
                                const isExpanded = expandedItemIdx === idx;
                                const availableModifiers = item.menuItem?.relatedModifiers || [];

                                return (
                                    <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900">{item.menuItem?.name}</div>
                                                {item.modifiers && item.modifiers.length > 0 && !isExpanded && (
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {item.modifiers.map((m: any) => `+${m.name} (x${m.quantity})`).join(", ")}
                                                    </div>
                                                )}
                                                {item.notes && !isExpanded && (
                                                    <div className="text-xs text-orange-600 italic mt-1">Note: {item.notes}</div>
                                                )}
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => setExpandedItemIdx(isExpanded ? null : idx)}
                                                    className="text-gray-500 hover:bg-gray-50 p-1 rounded text-xs"
                                                    title={t("edit_details")}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const newItems = editedItems.filter((_, i) => i !== idx);
                                                        setEditedItems(newItems);
                                                        setExpandedItemIdx(null);
                                                    }}
                                                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Quantity Controls */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    const newItems = [...editedItems];
                                                    if (newItems[idx].quantity > 1) {
                                                        newItems[idx].quantity--;
                                                        setEditedItems(newItems);
                                                    }
                                                }}
                                                className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded font-bold text-gray-700"
                                            >
                                                -
                                            </button>
                                            <span className="font-bold text-gray-900 min-w-[2rem] text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => {
                                                    const newItems = [...editedItems];
                                                    if (newItems[idx].quantity < 99) {
                                                        newItems[idx].quantity++;
                                                        setEditedItems(newItems);
                                                    }
                                                }}
                                                className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded font-bold text-gray-700"
                                            >
                                                +
                                            </button>
                                            <span className="text-sm text-gray-600 ml-auto">
                                                {restaurant.currency} {(
                                                    ((item.price ?? item.menuItem?.price ?? 0) * item.quantity) +
                                                    (item.modifiers?.reduce((sum: number, m: any) => sum + (m.price ?? 0) * m.quantity, 0) ?? 0)
                                                ).toFixed(2)}
                                            </span>
                                        </div>

                                        {/* Expanded: Modifiers & Notes */}
                                        {isExpanded && (
                                            <div className="border-t pt-2 mt-2 space-y-2">
                                                {/* Modifiers Section */}
                                                {availableModifiers.length > 0 && (
                                                    <div>
                                                        <div className="text-xs font-semibold text-gray-700 mb-1">{t("extras_label")}</div>
                                                        {availableModifiers.map((modId: string) => {
                                                            const modifier = menu?.modifiers?.find((m: any) => m._id === modId);
                                                            // Treat undefined isAvailable as true (backwards compatibility)
                                                            if (!modifier || modifier.isAvailable === false) return null;

                                                            const currentMod = item.modifiers?.find((m: any) => m.modifierId === modId);
                                                            const modQty = currentMod?.quantity || 0;

                                                            return (
                                                                <div key={modId} className="flex items-center justify-between text-xs py-1">
                                                                    <span className="text-gray-700">{modifier.name} (+{restaurant.currency}{modifier.price.toFixed(2)})</span>
                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            onClick={() => {
                                                                                const newItems = [...editedItems];
                                                                                const mods = newItems[idx].modifiers || [];
                                                                                const existingIdx = mods.findIndex((m: any) => m.modifierId === modId);

                                                                                if (existingIdx >= 0) {
                                                                                    if (mods[existingIdx].quantity > 1) {
                                                                                        mods[existingIdx].quantity--;
                                                                                    } else {
                                                                                        mods.splice(existingIdx, 1);
                                                                                    }
                                                                                }
                                                                                newItems[idx].modifiers = mods;
                                                                                setEditedItems(newItems);
                                                                            }}
                                                                            disabled={modQty === 0}
                                                                            className="bg-gray-100 hover:bg-gray-200 disabled:opacity-30 px-2 py-0.5 rounded font-bold text-gray-700"
                                                                        >
                                                                            -
                                                                        </button>
                                                                        <span className="min-w-[1.5rem] text-center font-bold">{modQty}</span>
                                                                        <button
                                                                            onClick={() => {
                                                                                const newItems = [...editedItems];
                                                                                const mods = newItems[idx].modifiers || [];
                                                                                const existingIdx = mods.findIndex((m: any) => m.modifierId === modId);

                                                                                if (existingIdx >= 0) {
                                                                                    mods[existingIdx].quantity++;
                                                                                } else {
                                                                                    mods.push({
                                                                                        modifierId: modId,
                                                                                        quantity: 1,
                                                                                        name: modifier.name,
                                                                                        price: modifier.price
                                                                                    });
                                                                                }
                                                                                newItems[idx].modifiers = mods;
                                                                                setEditedItems(newItems);
                                                                            }}
                                                                            className="bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded font-bold text-gray-700"
                                                                        >
                                                                            +
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Notes Section */}
                                                <div>
                                                    <div className="text-xs font-semibold text-gray-700 mb-1">{t("note_label")}</div>
                                                    <textarea
                                                        value={item.notes || ""}
                                                        onChange={(e) => {
                                                            const newItems = [...editedItems];
                                                            newItems[idx].notes = e.target.value;
                                                            setEditedItems(newItems);
                                                        }}
                                                        placeholder={t("add_special_instructions")}
                                                        className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                        rows={2}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {editedItems.length === 0 && (
                                <div className="text-center py-8 text-gray-400">
                                    {t("no_items_in_order")}
                                </div>
                            )}

                            {/* Add Item Section */}
                            {showAddItem && menu && (
                                <div className="border-2 border-indigo-200 rounded-lg p-3 bg-indigo-50">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-semibold text-gray-900">{t("add_item_title")}</h3>
                                        <button
                                            onClick={() => {
                                                setShowAddItem(false);
                                                setSearchQuery("");
                                            }}
                                            className="text-gray-500 hover:bg-gray-100 p-1 rounded"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Search Bar */}
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={t("search_items_placeholder")}
                                        className="w-full text-sm border border-gray-300 rounded px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />

                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {menu.categories?.map((category: any) => {
                                            // Filter items based on search query
                                            const filteredItems = category.items?.filter((item: any) =>
                                                item.isAvailable &&
                                                item.name.toLowerCase().includes(searchQuery.toLowerCase())
                                            ) || [];

                                            if (filteredItems.length === 0) return null;

                                            return (
                                                <div key={category._id}>
                                                    <div className="text-xs font-bold text-gray-600 mb-1 sticky top-0 bg-indigo-50">{category.name}</div>
                                                    {filteredItems.map((menuItem: any) => (
                                                        <button
                                                            key={menuItem._id}
                                                            onClick={() => {
                                                                setEditedItems([...editedItems, {
                                                                    menuItemId: menuItem._id,
                                                                    menuItem: menuItem,
                                                                    quantity: 1,
                                                                    price: menuItem.price,
                                                                    notes: "",
                                                                    modifiers: []
                                                                }]);
                                                                setShowAddItem(false);
                                                                setSearchQuery("");
                                                            }}
                                                            className="w-full text-left text-sm px-2 py-1.5 hover:bg-white rounded flex justify-between items-center transition-colors"
                                                        >
                                                            <span>{menuItem.name}</span>
                                                            <span className="text-xs text-gray-600">{restaurant.currency}{menuItem.price.toFixed(2)}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                        {menu.categories?.every((cat: any) =>
                                            !cat.items?.some((item: any) =>
                                                item.isAvailable && item.name.toLowerCase().includes(searchQuery.toLowerCase())
                                            )
                                        ) && searchQuery && (
                                                <div className="text-center py-4 text-gray-500 text-sm">
                                                    {t("no_items_found", { query: searchQuery })}
                                                </div>
                                            )}
                                    </div>
                                </div>
                            )}

                            {!showAddItem && (
                                <button
                                    onClick={() => setShowAddItem(true)}
                                    className="w-full border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 rounded-lg py-3 text-gray-600 hover:text-indigo-600 font-medium transition-colors"
                                >
                                    {t("add_item_to_order")}
                                </button>
                            )}

                            <div className="border-t border-gray-200 pt-3 mt-3">
                                <div className="flex justify-between font-bold text-lg">
                                    <span>{t("total")}:</span>
                                    <span>{restaurant.currency} {editedItems.reduce((sum, item) => {
                                        const itemPrice = (item.price ?? item.menuItem?.price ?? 0) * item.quantity;
                                        const modifiersPrice = item.modifiers?.reduce((mSum: number, m: any) => mSum + (m.price ?? 0) * m.quantity, 0) ?? 0;
                                        return sum + itemPrice + modifiersPrice;
                                    }, 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 grid grid-cols-2 gap-3">
                            <button
                                onClick={() => {
                                    setEditingOrder(null);
                                    setEditedItems([]);
                                    setExpandedItemIdx(null);
                                    setShowAddItem(false);
                                    setSearchQuery("");
                                }}
                                className="bg-gray-100 text-gray-700 hover:bg-gray-200 py-2 rounded-lg font-bold transition-colors"
                            >
                                {t("cancel")}
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        if (editedItems.length === 0) {
                                            alert(t("cannot_save_empty_order"));
                                            return;
                                        }

                                        const itemsToSave = editedItems.map(item => ({
                                            menuItemId: item.menuItemId,
                                            quantity: item.quantity,
                                            notes: item.notes,
                                            modifiers: item.modifiers?.map((m: any) => ({
                                                modifierId: m.modifierId,
                                                quantity: m.quantity
                                            }))
                                        }));

                                        await updateOrderItems({
                                            orderId: editingOrder._id,
                                            items: itemsToSave
                                        });

                                        setEditingOrder(null);
                                        setEditedItems([]);
                                        setExpandedItemIdx(null);
                                        setShowAddItem(false);
                                        setSearchQuery("");
                                    } catch (error: any) {
                                        alert(t("error_saving_order", { error: error.message }));
                                    }
                                }}
                                className="bg-indigo-600 text-white hover:bg-indigo-700 py-2 rounded-lg font-bold transition-colors shadow-sm"
                            >
                                {t("save_changes")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
