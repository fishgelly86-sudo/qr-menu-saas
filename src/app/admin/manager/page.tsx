/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { CheckCircle, Clock, Coffee, DollarSign, Printer, X, Trash2 } from "lucide-react";
import clsx from "clsx";
import { useState, useMemo } from "react";
import { useRestaurant } from "./RestaurantContext";

import { useLanguage } from "@/contexts/LanguageContext";

export default function AdminDashboard() {
    // Use shared restaurant context from layout
    const { restaurant } = useRestaurant();
    const { t } = useLanguage();

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
    const archiveAndClearTable = useMutation(api.orders.archiveAndClearTable);

    // Group orders by Table for active sessions - MUST be called unconditionally
    const groupedOrders = useMemo(() => {
        return (orders ?? []).reduce((acc: any[], order: any) => {
            // Find existing group for this table
            const existingGroup = acc.find((g: any) => g.table?._id === order.table?._id);

            if (existingGroup) {
                existingGroup.orders.push(order);
                existingGroup.items = [...existingGroup.items, ...order.items]; // Flatten items for now
                existingGroup.totalAmount += order.totalAmount;

                // Status priority: pending (needs attention) > preparing > ready > served > paid > cancelled
                const statusPriority = ['pending', 'preparing', 'ready', 'served', 'paid', 'cancelled'];

                const currentStatusIdx = statusPriority.indexOf(existingGroup.status);
                const newStatusIdx = statusPriority.indexOf(order.status);

                // If the new order needs more attention (lower index), update the group status
                if (newStatusIdx < currentStatusIdx) {
                    existingGroup.status = order.status;
                }

                existingGroup.isGroup = true;
            } else {
                acc.push({
                    _id: order._id, // Use first order ID as key
                    table: order.table,
                    status: order.status,
                    orders: [order],
                    items: order.items,
                    totalAmount: order.totalAmount,
                    creationTime: order._creationTime,
                    isGroup: false
                });
            }
            return acc;
        }, []);
    }, [orders]);

    // Early returns AFTER all hooks
    if (restaurant === undefined || orders === undefined) {
        return <div className="p-8 text-center">{t("loading_status")}</div>;
    }

    if (restaurant === null) {
        return <div className="p-8 text-center text-red-500">{t("manager_login_required")}</div>;
    }

    const handlePrintReceipt = (order: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const direction = t("direction" as any) === "rtl" ? "rtl" : "ltr";
        const receiptHTML = `
            <!DOCTYPE html>
            <html dir="${direction}">
            <head>
                <title>${t("print_receipt")} - ${t("table_no")} ${order.table?.number}</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
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
                    <p>${t("table_no")} ${order.table?.number}</p>
                    <p>${t("date" as any) || "Date"}: ${new Date(order._creationTime).toLocaleString()}</p>
                    <p>${t("status" as any) || "Status"}: ${t("status_paid")}</p>
                </div>
                <div class="items">
                    ${order.items.map((item: any) => `
                        <div class="item">
                            <span>${item.quantity}x ${item.menuItem?.name || 'Unknown Item'}</span>
                            <span>${restaurant.currency} ${((item.price ?? item.menuItem?.price) * item.quantity).toFixed(2)}</span>
                        </div>
                        ${item.modifiers ? item.modifiers.map((mod: any) => `
                            <div class="item" style="font-size: 12px; color: #555; padding-${direction === "rtl" ? "right" : "left"}: 20px; margin: 4px 0;">
                                <span>+ ${mod.name || "Extra"} (x${mod.quantity})</span>
                                <span>${mod.price > 0 ? `${restaurant.currency} ${(mod.price * mod.quantity).toFixed(2)}` : ''}</span>
                            </div>
                        `).join('') : ''}
                        ${item.notes ? `<div style="font-size: 12px; color: #555; padding-${direction === "rtl" ? "right" : "left"}: 20px; font-style: italic;">${t("note")}: ${item.notes}</div>` : ''}
                    `).join('')}
                </div>
                <div class="total">
                    <div class="item">
                        <span>${t("total").toUpperCase()}:</span>
                        <span>${restaurant.currency} ${order.totalAmount.toFixed(2)}</span>
                    </div>
                </div>
                <div class="footer">
                    <p>${t("bon_appetit")}</p>
                </div>
                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">${t("print_receipt")}</button>
                    <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; margin-left: 10px;">${t("close" as any) || "Close"}</button>
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

    const handleStatusUpdate = async (group: any, newStatus: "pending" | "preparing" | "ready" | "served" | "paid") => {
        // Update all orders in the group into the new status
        // BUT skip orders that are already paid or cancelled (don't regress them)
        for (const order of group.orders) {
            if (order.status === 'paid' || order.status === 'cancelled') continue;
            await updateStatus({ orderId: order._id, status: newStatus });
        }
    };

    const handleCancelOrder = async (orderId: any) => {
        if (confirm(t("cancel_order_confirm"))) {
            await cancelOrder({ orderId });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                            {t("dashboard")}
                        </h1>
                        <p className="text-sm text-gray-500 sm:hidden">
                            {t("active_orders", { count: orders.length.toString() })}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                        <div className="text-sm text-gray-500 hidden sm:block whitespace-nowrap">
                            {t("active_orders", { count: orders.length.toString() })}
                        </div>
                        <button
                            onClick={async () => {
                                if (confirm(t("clear_dashboard_confirm"))) {
                                    const result = await archiveCompletedOrders({ restaurantId: restaurant._id });
                                    alert(t("orders_cleared_msg", { count: result.archivedCount.toString() }));
                                }
                            }}
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-md border border-gray-200 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                        >
                            <Trash2 className="w-3 h-3" />
                            {t("clear_dashboard")}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-4 sm:py-6 sm:px-6 lg:px-8">
                <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {groupedOrders.map((group: any) => (
                        <div key={group._id} className="bg-white overflow-hidden shadow rounded-lg flex flex-col relative group">
                            {!group.isGroup && group.status !== "cancelled" && group.status !== "paid" && (
                                <button
                                    onClick={() => handleCancelOrder(group._id)}
                                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors z-10"
                                    title={t("remove")}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}

                            <div className="px-4 py-5 sm:p-6 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900">
                                            {t("table_no")} {group.table?.number}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {new Date(group.creationTime).toLocaleTimeString()}
                                            {group.orders.length > 1 && ` • ${group.orders.length} ${t("items")}`}
                                        </p>
                                    </div>
                                    <span className={clsx(
                                        "px-2 py-1 text-xs font-medium rounded-full",
                                        statusColors[group.status as keyof typeof statusColors]
                                    )}>
                                        {t(`status_${group.status}` as any).toUpperCase()}
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {group.items.map((item: any, idx: number) => (
                                        <div key={idx} className="flex flex-col text-sm border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                                            <div className="flex justify-between">
                                                <div className="flex items-start gap-2">
                                                    <span className="font-medium text-gray-900">{item.quantity}x</span>
                                                    <span className="text-gray-700">{item.menuItem?.name || "Unknown Item"}</span>
                                                </div>
                                                <span className="text-gray-900">
                                                    {/* Use snapshot price if available, else fallback to current price */}
                                                    {restaurant.currency} {((item.price ?? item.menuItem?.price) * item.quantity).toFixed(2)}
                                                </span>
                                            </div>
                                            {/* Modifiers */}
                                            {item.modifiers && item.modifiers.length > 0 && (
                                                <div className="pl-6 pr-6 text-xs text-gray-500 mt-1 space-y-1">
                                                    {item.modifiers.map((mod: any, mIdx: number) => (
                                                        <div key={mIdx} className="flex justify-between">
                                                            <span>+ {mod.name || "Extra"} (x{mod.quantity})</span>
                                                            {/* Use snapshot price if available */}
                                                            {mod.price > 0 && (
                                                                <span>{restaurant.currency} {(mod.price * mod.quantity).toFixed(2)}</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {/* Notes */}
                                            {item.notes && (
                                                <p className="pl-6 pr-6 text-xs text-orange-600 italic mt-1">
                                                    {t("note")}: {item.notes}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 pt-4 border-t flex justify-between items-center">
                                    <span className={clsx(
                                        "font-bold text-lg",
                                        group.status === "paid" ? "text-green-600" : "text-black"
                                    )}>
                                        {t("total")}: {restaurant.currency} {group.totalAmount.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-gray-50 px-4 py-4 sm:px-6 flex gap-2 justify-end">
                                {group.status === "pending" && (
                                    <button
                                        onClick={() => handleStatusUpdate(group, "preparing")}
                                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        <Coffee className="h-4 w-4 mr-1 ml-1" />
                                        {t("start_preparing")}
                                    </button>
                                )}
                                {group.status === "preparing" && (
                                    <button
                                        onClick={() => handleStatusUpdate(group, "ready")}
                                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                                    >
                                        <CheckCircle className="h-4 w-4 mr-1 ml-1" />
                                        {t("mark_ready")}
                                    </button>
                                )}
                                {group.status === "ready" && (
                                    <button
                                        onClick={() => handleStatusUpdate(group, "served")}
                                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                        <CheckCircle className="h-4 w-4 mr-1 ml-1" />
                                        {t("serve")}
                                    </button>
                                )}
                                {group.status === "served" && (
                                    <button
                                        onClick={() => handleStatusUpdate(group, "paid")}
                                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                    >
                                        <DollarSign className="h-4 w-4 mr-1 ml-1" />
                                        {t("mark_paid")}
                                    </button>
                                )}
                                {group.status === "paid" && (
                                    <button
                                        onClick={() => handlePrintReceipt(group.orders[0])}
                                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                        <Printer className="h-4 w-4 mr-1 ml-1" />
                                        {t("print_receipt")}
                                    </button>
                                )}
                                {group.status === "cancelled" && (
                                    <button
                                        onClick={async () => {
                                            if (confirm(t("reset_table_confirm"))) {
                                                await archiveAndClearTable({ tableId: group.table._id });
                                            }
                                        }}
                                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    >
                                        <Trash2 className="h-4 w-4 mr-1 ml-1" />
                                        {t("delete")}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {orders.length === 0 && (
                        <div className="col-span-full text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                            <Clock className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">{t("no_active_orders_msg")}</h3>
                            <p className="mt-1 text-sm text-gray-500">{t("new_orders_appear_automatically")}</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
