"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Shield, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

export default function SuperAdminDashboard() {
    const router = useRouter();
    const restaurants = useQuery(api.subscriptions.listAllRestaurants);
    const updateStatus = useMutation(api.subscriptions.updateSubscriptionStatus);

    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const handleStatusChange = async (restaurantId: any, status: "active" | "suspended" | "trial") => {
        try {
            setUpdatingId(restaurantId);
            await updateStatus({
                restaurantId,
                status,
                expiresAt: status === "trial" ? Date.now() + 14 * 24 * 60 * 60 * 1000 : undefined
            });
        } catch (error) {
            console.error(error);
            alert("Failed to update status");
        } finally {
            setUpdatingId(null);
        }
    };

    if (restaurants === undefined) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (restaurants instanceof Error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <h1 className="text-xl font-bold text-red-500 mb-2">Unauthorized</h1>
                    <p className="text-gray-400">You do not have permission to view this page.</p>
                </div>
            </div>
        );
    }

    // Stats
    const total = restaurants.length;
    const active = restaurants.filter(r => r.subscriptionStatus === "active").length;
    const trial = restaurants.filter(r => r.subscriptionStatus === "trial").length;
    const suspended = restaurants.filter(r => r.subscriptionStatus === "suspended").length;

    return (
        <div className="min-h-screen bg-gray-950 text-white p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <Shield className="h-8 w-8 text-red-500" />
                        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
                    </div>
                </header>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                        <h3 className="text-gray-400 text-sm font-medium mb-2">Total Restaurants</h3>
                        <p className="text-3xl font-bold">{total}</p>
                    </div>
                    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                        <h3 className="text-green-400 text-sm font-medium mb-2">Active</h3>
                        <p className="text-3xl font-bold text-green-500">{active}</p>
                    </div>
                    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                        <h3 className="text-blue-400 text-sm font-medium mb-2">Trial</h3>
                        <p className="text-3xl font-bold text-blue-500">{trial}</p>
                    </div>
                    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                        <h3 className="text-red-400 text-sm font-medium mb-2">Suspended</h3>
                        <p className="text-3xl font-bold text-red-500">{suspended}</p>
                    </div>
                </div>

                {/* Restaurants Table */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-800">
                        <h2 className="text-xl font-semibold">Subscription Management</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900/50 text-gray-400 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3">Restaurant</th>
                                    <th className="px-6 py-3">Slug</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Plan</th>
                                    <th className="px-6 py-3">Expires</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {restaurants.map((restaurant) => (
                                    <tr key={restaurant._id} className="hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium">{restaurant.name}</td>
                                        <td className="px-6 py-4 text-gray-400 text-sm">{restaurant.slug}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${restaurant.subscriptionStatus === 'active' ? 'bg-green-900/30 text-green-400' :
                                                restaurant.subscriptionStatus === 'suspended' ? 'bg-red-900/30 text-red-400' :
                                                    'bg-blue-900/30 text-blue-400'
                                                }`}>
                                                {restaurant.subscriptionStatus || 'trial'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">{restaurant.plan || 'basic'}</td>
                                        <td className="px-6 py-4 text-gray-400 text-sm">
                                            {restaurant.subscriptionExpiresAt
                                                ? new Date(restaurant.subscriptionExpiresAt).toLocaleDateString()
                                                : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {restaurant.subscriptionStatus !== 'active' && (
                                                <button
                                                    onClick={() => handleStatusChange(restaurant._id, 'active')}
                                                    className="px-3 py-1 bg-green-900/30 hover:bg-green-900/50 text-green-400 rounded text-xs transition-colors"
                                                    disabled={updatingId === restaurant._id}
                                                >
                                                    Activate
                                                </button>
                                            )}
                                            {restaurant.subscriptionStatus !== 'suspended' && (
                                                <button
                                                    onClick={() => handleStatusChange(restaurant._id, 'suspended')}
                                                    className="px-3 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded text-xs transition-colors"
                                                    disabled={updatingId === restaurant._id}
                                                >
                                                    Suspend
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
