/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { DollarSign, ShoppingBag, TrendingUp, Calendar } from "lucide-react";
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
                    <p className="text-gray-500">Overview of your restaurant's performance</p>
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
                    <p className="text-sm text-green-600 mt-2 flex items-center font-medium">
                        <TrendingUp className="w-4 h-4 mr-1" /> +{stats.trendPercentage}% vs last period
                    </p>
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
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Active Tables</h3>
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-purple-600" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                        --
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        Real-time occupancy
                    </p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Popular Items */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Top Selling Items</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.popularItems} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={100} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Orders Trend */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Orders Trend</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.ordersTrend}>
                                <defs>
                                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} tickFormatter={(val) => val.length > 5 ? val.slice(5) : val} />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="orders" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorOrders)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
