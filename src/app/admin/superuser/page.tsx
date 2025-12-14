"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../../../convex/_generated/dataModel";

export default function SuperAdminPage() {
    const restaurants = useQuery(api.subscriptions.listAllRestaurants);
    const updateStatus = useMutation(api.subscriptions.updateSubscriptionStatus);

    const [selectedRestaurant, setSelectedRestaurant] = useState<Id<"restaurants"> | null>(null);
    const [newStatus, setNewStatus] = useState<"active" | "suspended" | "trial">("active");
    const [expiryDays, setExpiryDays] = useState(30);

    const handleUpdateSubscription = async () => {
        if (!selectedRestaurant) return;

        const expiresAt = Date.now() + expiryDays * 24 * 60 * 60 * 1000;

        try {
            await updateStatus({
                restaurantId: selectedRestaurant,
                status: newStatus,
                expiresAt,
            });
            alert("Subscription updated successfully");
            setSelectedRestaurant(null);
        } catch (error: any) {
            alert(error.message);
        }
    };

    const formatDate = (timestamp?: number) => {
        if (!timestamp) return "—";
        return new Date(timestamp).toLocaleDateString();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "active":
                return "bg-green-100 text-green-800";
            case "trial":
                return "bg-blue-100 text-blue-800";
            case "suspended":
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Super Admin - Subscription Management</h1>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {restaurants?.map((restaurant) => (
                                <tr key={restaurant._id}>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{restaurant.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{restaurant.slug}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(restaurant.subscriptionStatus || 'trial')}`}>
                                            {restaurant.subscriptionStatus || 'trial'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{restaurant.plan || 'basic'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(restaurant.subscriptionExpiresAt)}</td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => setSelectedRestaurant(restaurant._id)}
                                            className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                                        >
                                            Manage
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Edit Modal */}
                {selectedRestaurant && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full">
                            <h2 className="text-2xl font-bold mb-4">Update Subscription</h2>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Status
                                </label>
                                <select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value as any)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="active">Active</option>
                                    <option value="trial">Trial</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Expires in (days)
                                </label>
                                <input
                                    type="number"
                                    value={expiryDays}
                                    onChange={(e) => setExpiryDays(Number(e.target.value))}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSelectedRestaurant(null)}
                                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateSubscription}
                                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                >
                                    Update
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
