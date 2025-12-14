"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Shield, Plus, Key, Loader2, AlertCircle } from "lucide-react";
import bcrypt from "bcryptjs";

export default function SuperAdminRestaurants() {
    const restaurants = useQuery(api.superAdmin.listRestaurants);
    const createRestaurant = useMutation(api.superAdmin.createRestaurant);
    const updatePassword = useMutation(api.superAdmin.updateRestaurantPassword);

    const [form, setForm] = useState({
        name: "",
        slug: "",
        email: "",
        password: ""
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Create New Restaurant
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            if (!form.name || !form.slug || !form.email || !form.password) {
                throw new Error("All fields are required");
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(form.password, salt);

            await createRestaurant({
                name: form.name,
                slug: form.slug,
                ownerEmail: form.email,
                passwordHash: hashedPassword
            });

            setForm({ name: "", slug: "", email: "", password: "" });
            alert("Restaurant created successfully!");
        } catch (err: any) {
            setError(err.message || "Failed to create restaurant");
        } finally {
            setIsLoading(false);
        }
    };

    // Reset Password
    const handleResetPassword = async (restaurantId: any, restaurantName: string) => {
        const newPassword = prompt(`Enter new password for ${restaurantName}:`);
        if (!newPassword) return;

        try {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            await updatePassword({
                restaurantId,
                passwordHash: hashedPassword
            });

            alert("Password updated successfully");
        } catch (err) {
            alert("Failed to update password");
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
                    <p className="text-gray-400">You must be a super admin to view this page.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex items-center gap-3 border-b border-gray-800 pb-6">
                    <Shield className="h-8 w-8 text-indigo-500" />
                    <h1 className="text-3xl font-bold">Restaurant Management</h1>
                </header>

                {/* Create Form */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <Plus className="h-5 w-5 text-green-500" />
                        Create New Restaurant
                    </h2>

                    <form onSubmit={handleCreate} className="space-y-4 max-w-2xl">
                        {error && (
                            <div className="bg-red-900/50 border border-red-800 text-red-200 p-3 rounded flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Restaurant Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Burger King"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Slug (URL)</label>
                                <input
                                    type="text"
                                    value={form.slug}
                                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:ring-2 focus:ring-indigo-500"
                                    placeholder="burger-king"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Owner Email</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:ring-2 focus:ring-indigo-500"
                                    placeholder="admin@restaurant.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Initial Password</label>
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Secr3t!"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium disabled:opacity-50 transition-colors"
                            >
                                {isLoading ? "Creating..." : "Create Restaurant"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Restaurant List */}
                <div className="bg-gray-900 rounded-xl border border-gray-800">
                    <div className="px-6 py-4 border-b border-gray-800">
                        <h2 className="text-xl font-semibold">Existing Restaurants</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900/50 text-gray-400 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Slug</th>
                                    <th className="px-6 py-3">Owner Email</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {restaurants.map((restaurant) => (
                                    <tr key={restaurant._id} className="hover:bg-gray-800/50">
                                        <td className="px-6 py-4 font-medium">{restaurant.name}</td>
                                        <td className="px-6 py-4 text-gray-400 font-mono text-sm">{restaurant.slug}</td>
                                        <td className="px-6 py-4 text-gray-400">{restaurant.ownerEmail || "-"}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400">
                                                {restaurant.subscriptionStatus || "Active"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleResetPassword(restaurant._id, restaurant.name)}
                                                className="text-gray-400 hover:text-white flex items-center gap-1 ml-auto text-sm transition-colors"
                                                title="Reset Password"
                                            >
                                                <Key className="h-4 w-4" />
                                                Reset Password
                                            </button>
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
