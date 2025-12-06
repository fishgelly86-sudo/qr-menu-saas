/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, ShoppingBag, TrendingUp, Calendar, Star } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";

export default function AnalyticsPage() {
    // Hardcoded slug for demo
    const restaurantSlug = "burger-bistro";
    const restaurant = useQuery(api.restaurants.getRestaurantBySlug, { slug: restaurantSlug }) as any;

    const [dateRange, setDateRange] = useState<"today" | "7days" | "30days">("today");



    // We use useMemo to ensure timestamps don't change on every render unless dateRange changes
    // We also need to be careful about 'now' changing. 
    // Let's just calculate it when dateRange changes.
    const { startTime, endTime } = useMemo(() => {
        const now = new Date();
        const end = now.getTime();
        let start = new Date(now).setHours(0, 0, 0, 0);

        if (dateRange === "7days") {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            start = d.setHours(0, 0, 0, 0);
        } else if (dateRange === "30days") {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            start = d.setHours(0, 0, 0, 0);
        }
        return { startTime: start, endTime: end };
    }, [dateRange]);

    const stats = useQuery(api.analytics.getDashboardStats,
        restaurant ? { restaurantId: restaurant._id, startTime, endTime } : "skip"
    ) as any;

    if (!restaurant || !stats) return <div className="p-8">Loading Analytics...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
                    <p className="text-gray-500">Overview of your restaurant&apos;s performance</p>
                </div>
                <div className="flex items-center bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                    <button
                        onClick={() => setDateRange("today")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${dateRange === "today" ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setDateRange("7days")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${dateRange === "7days" ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                    >
                        Last 7 Days
                    </button>
                    <button
                        onClick={() => setDateRange("30days")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${dateRange === "30days" ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                    >
                        Last 30 Days
                    </button>
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Sales Today</h3>
                        <div className="p-2 bg-green-100 rounded-lg">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                        {restaurant.currency} {stats.totalRevenue.toFixed(2)}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Orders Today</h3>
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <ShoppingBag className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                        {stats.totalOrders}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        Avg. Order: {restaurant.currency} {(stats.totalRevenue / (stats.totalOrders || 1)).toFixed(2)}
                    </p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Most Picked Item</h3>
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <Star className="w-5 h-5 text-emerald-600" />
                        </div>
                    </div>
                    {stats.mostPickedItem ? (
                        <div>
                            <div className="flex items-center gap-4 mb-2">
                                {stats.mostPickedItem.imageUrl && (
                                    <img
                                        src={stats.mostPickedItem.imageUrl}
                                        alt={stats.mostPickedItem.name}
                                        className="w-12 h-12 rounded-lg object-cover"
                                    />
                                )}
                                <div>
                                    <div className="text-lg font-bold text-gray-900">
                                        {stats.mostPickedItem.name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {stats.mostPickedItem.count} orders
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-emerald-600 font-medium">
                                {restaurant.currency} {stats.mostPickedItem.revenue.toFixed(2)} revenue
                            </p>
                        </div>
                    ) : (
                        <div className="text-gray-400 italic">No data yet</div>
                    )}
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1">
                {/* Revenue by Category */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 text-center">Revenue by Category</h3>
                    <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.revenueByCategory}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={120}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.revenueByCategory?.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => [`${restaurant.currency} ${value.toFixed(2)}`, 'Revenue']} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
