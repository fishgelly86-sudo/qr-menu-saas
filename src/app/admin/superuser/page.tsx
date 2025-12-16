"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import bcrypt from 'bcryptjs';
import { useRouter } from "next/navigation";
import { Plus, Search, Key, Pencil, Trash2, Building2, Users, Shield, TrendingUp, AlertTriangle } from "lucide-react";

export default function SuperAdminPage() {
    const restaurants = useQuery(api.subscriptions.listAllRestaurants);
    const updateRestaurant = useMutation(api.superAdmin.updateRestaurantDetails);
    const createRestaurant = useMutation(api.superAdmin.createRestaurant);
    const deleteRestaurant = useMutation(api.superAdmin.deleteRestaurant); // Make sure this is imported/defined
    const generateToken = useMutation(api.superAdmin.generateImpersonationToken);

    const router = useRouter();
    const [secretKey, setSecretKey] = useState("");

    const [editingRestaurant, setEditingRestaurant] = useState<any | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Edit Form State
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        plan: "basic",
        status: "active",
        expiryDays: 30
    });

    // Create Form State
    const [createFormData, setCreateFormData] = useState({
        name: "",
        slug: "",
        email: "",
        password: ""
    });

    const handleEditClick = (restaurant: any) => {
        setEditingRestaurant(restaurant);
        // Calculate remaining days
        const days = restaurant.subscriptionExpiresAt
            ? Math.ceil((restaurant.subscriptionExpiresAt - Date.now()) / (1000 * 60 * 60 * 24))
            : 0;

        setFormData({
            name: restaurant.name,
            slug: restaurant.slug,
            plan: restaurant.plan || "basic",
            status: restaurant.subscriptionStatus || "active",
            expiryDays: days > 0 ? days : 0
        });
    };

    const handleSaveRestaurant = async () => {
        if (!editingRestaurant) return;

        const expiresAt = Date.now() + formData.expiryDays * 24 * 60 * 60 * 1000;

        try {
            await updateRestaurant({
                restaurantId: editingRestaurant._id,
                name: formData.name,
                slug: formData.slug,
                plan: formData.plan,
                subscriptionStatus: formData.status as any,
                subscriptionExpiresAt: expiresAt,
            });

            alert("Restaurant updated successfully");
            setEditingRestaurant(null);
        } catch (error: any) {
            alert("Error updating restaurant: " + error.message);
        }
    };

    const handleDeleteRestaurant = async () => {
        if (!editingRestaurant) return;

        if (!confirm(`Are you sure you want to PERMANENTLY delete "${editingRestaurant.name}"? This action cannot be undone.`)) {
            return;
        }

        const enteredName = prompt(`Type "${editingRestaurant.name}" to confirm deletion:`);
        if (enteredName !== editingRestaurant.name) {
            alert("Name mismatch. Deletion cancelled.");
            return;
        }

        try {
            await deleteRestaurant({ restaurantId: editingRestaurant._id });
            alert("Restaurant deleted successfully");
            setEditingRestaurant(null);
        } catch (error: any) {
            alert("Error deleting restaurant: " + error.message);
        }
    };

    const handleCreateRestaurant = async () => {
        if (!createFormData.name || !createFormData.slug || !createFormData.email || !createFormData.password) {
            alert("Please fill in all fields");
            return;
        }

        try {
            const hashedPassword = await bcrypt.hash(createFormData.password, 10);

            await createRestaurant({
                name: createFormData.name,
                slug: createFormData.slug,
                ownerEmail: createFormData.email,
                passwordHash: hashedPassword,
            });

            alert("Restaurant created successfully!");
            setIsCreateModalOpen(false);
            setCreateFormData({ name: "", slug: "", email: "", password: "" });
        } catch (error: any) {
            alert("Error creating restaurant: " + error.message);
        }
    };

    const handleLoginAs = async (restaurantId: Id<"restaurants">) => {
        let key = secretKey;
        if (!key) {
            key = prompt("Enter Super Admin Secret Key to impersonate:") || "";
            if (!key) return;
            setSecretKey(key); // Cache it for session
        }

        try {
            const result = await generateToken({ restaurantId, secretKey: key });
            if (result.success) {
                // Save session
                localStorage.setItem("admin_session", JSON.stringify(result));
                // Redirect
                router.push("/admin/manager?from=superadmin");
            }
        } catch (error: any) {
            alert("Impersonation failed: " + error.message);
            setSecretKey(""); // Clear invalid key
        }
    };

    const formatDate = (timestamp?: number) => {
        if (!timestamp) return "—";
        return new Date(timestamp).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusStyles = (status: string) => {
        const lower = (status || 'trial').toLowerCase();
        switch (lower) {
            case "active":
                return "bg-green-100 text-green-700 border-green-200";
            case "trial":
                return "bg-blue-100 text-blue-700 border-blue-200";
            case "suspended":
                return "bg-red-100 text-red-700 border-red-200";
            default:
                return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    // Derived Stats
    const totalRestaurants = restaurants?.length || 0;
    const activeRestaurants = restaurants?.filter(r => r.subscriptionStatus === "active").length || 0;
    const trialRestaurants = restaurants?.filter(r => r.subscriptionStatus === "trial" || !r.subscriptionStatus).length || 0;
    const suspendedRestaurants = restaurants?.filter(r => r.subscriptionStatus === "suspended").length || 0;

    return (
        <div className="min-h-screen bg-gray-50/50 p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Super Admin Dashboard</h1>
                        <p className="text-sm text-gray-500 mt-1">Manage your restaurant partners and subscriptions</p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create Restaurant
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-xl border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Restaurants</p>
                                <p className="text-2xl font-semibold text-gray-900">{totalRestaurants}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Active Plans</p>
                                <p className="text-2xl font-semibold text-gray-900">{activeRestaurants}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">On Trial</p>
                                <p className="text-2xl font-semibold text-gray-900">{trialRestaurants}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Suspended</p>
                                <p className="text-2xl font-semibold text-gray-900">{suspendedRestaurants}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-base font-semibold text-gray-900">All Restaurants</h2>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-64"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Restaurant</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Slug</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expires</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {restaurants?.map((restaurant) => (
                                    <tr key={restaurant._id} className="hover:bg-gray-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs uppercase">
                                                    {restaurant.name.substring(0, 2)}
                                                </div>
                                                <span className="text-sm font-medium text-gray-900">{restaurant.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <code className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded border border-gray-100">
                                                {restaurant.slug}
                                            </code>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles(restaurant.subscriptionStatus || 'trial')}`}>
                                                {restaurant.subscriptionStatus || 'trial'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 capitalize">{restaurant.plan || 'basic'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500 font-mono">{formatDate(restaurant.subscriptionExpiresAt)}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2 opacity-100">
                                                <button
                                                    onClick={() => handleLoginAs(restaurant._id)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 shadow-sm transition-all"
                                                    title="Login as Manager"
                                                >
                                                    <Key className="w-3.5 h-3.5 text-gray-500" />
                                                    Login As
                                                </button>
                                                <button
                                                    onClick={() => handleEditClick(restaurant)}
                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                                    title="Edit Details"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Edit Modal (Restyled) */}
                {editingRestaurant && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h2 className="text-lg font-semibold text-gray-900">Edit Restaurant</h2>
                                <button onClick={() => setEditingRestaurant(null)} className="text-gray-400 hover:text-gray-600">
                                    <span className="sr-only">Close</span>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-1.5">Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-1.5">Slug</label>
                                        <input
                                            type="text"
                                            value={formData.slug}
                                            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                        />
                                        <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            Warning: Changing this breaks existing QR codes!
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-1.5">Status</label>
                                            <select
                                                value={formData.status}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                            >
                                                <option value="active">Active</option>
                                                <option value="suspended">Suspended</option>
                                                <option value="trial">Trial</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-1.5">Plan</label>
                                            <select
                                                value={formData.plan}
                                                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                            >
                                                <option value="basic">Basic</option>
                                                <option value="pro">Pro</option>
                                                <option value="enterprise">Enterprise</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-1.5">Expires in (days)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={formData.expiryDays}
                                                onChange={(e) => setFormData({ ...formData, expiryDays: Number(e.target.value) })}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none pl-3"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">days</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={handleDeleteRestaurant}
                                        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </button>
                                    <div className="flex-1"></div>
                                    <button
                                        onClick={() => setEditingRestaurant(null)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveRestaurant}
                                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Create Modal (Restyled) */}
                {isCreateModalOpen && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h2 className="text-lg font-semibold text-gray-900">Create New Restaurant</h2>
                                <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                    <span className="sr-only">Close</span>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-1.5">Restaurant Name</label>
                                        <input
                                            type="text"
                                            value={createFormData.name}
                                            onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                            placeholder="e.g. Burger Bistro"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-1.5">Slug (URL)</label>
                                        <div className="flex">
                                            <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm">
                                                /
                                            </span>
                                            <input
                                                type="text"
                                                value={createFormData.slug}
                                                onChange={(e) => setCreateFormData({ ...createFormData, slug: e.target.value })}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-r-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                                placeholder="burger-bistro"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-1.5">Owner Email</label>
                                        <input
                                            type="email"
                                            value={createFormData.email}
                                            onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                            placeholder="owner@example.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-1.5">Initial Password</label>
                                        <input
                                            type="password"
                                            value={createFormData.password}
                                            onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => {
                                            setIsCreateModalOpen(false);
                                            setCreateFormData({ name: "", slug: "", email: "", password: "" });
                                        }}
                                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateRestaurant}
                                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                                    >
                                        Create Restaurant
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
