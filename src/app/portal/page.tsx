/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import { ExternalLink, ChefHat, User, Utensils, LayoutDashboard } from "lucide-react";

export default function PortalPage() {
    const restaurants = useQuery(api.restaurants.listRestaurants) as any;

    if (restaurants === undefined) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading portal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">System Portal</h1>
                        <p className="text-gray-600 mt-1">Manage and view all restaurants in the system</p>
                    </div>
                    <Link
                        href="/"
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                        Back to Home
                    </Link>
                </div>

                {restaurants.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Utensils className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Restaurants Found</h3>
                        <p className="text-gray-500 max-w-sm mx-auto">
                            There are no restaurants in the system yet. Run the seed script to create some demo data.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {restaurants.map((restaurant: any) => (
                            <div
                                key={restaurant._id}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                            >
                                <div className="p-6 border-b border-gray-100">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">{restaurant.name}</h2>
                                            <p className="text-sm text-gray-500 mt-1 font-mono bg-gray-100 px-2 py-0.5 rounded inline-block">
                                                {restaurant.slug}
                                            </p>
                                        </div>
                                        {restaurant.logoUrl && (
                                            <img
                                                src={restaurant.logoUrl}
                                                alt={restaurant.name}
                                                className="w-12 h-12 rounded-full object-cover border border-gray-200"
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 grid grid-cols-2 gap-3">
                                    {/* Admin Link */}
                                    <Link
                                        href={`/admin/manager/menu?slug=${restaurant.slug}`}
                                        className="flex flex-col items-center justify-center p-3 rounded-lg bg-gray-50 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 border border-transparent transition-all group"
                                    >
                                        <LayoutDashboard className="w-6 h-6 text-gray-400 group-hover:text-amber-500 mb-2" />
                                        <span className="text-sm font-medium">Admin</span>
                                    </Link>

                                    {/* Kitchen Link */}
                                    <Link
                                        href={`/admin/kitchen?slug=${restaurant.slug}`}
                                        className="flex flex-col items-center justify-center p-3 rounded-lg bg-gray-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-transparent transition-all group"
                                    >
                                        <ChefHat className="w-6 h-6 text-gray-400 group-hover:text-blue-500 mb-2" />
                                        <span className="text-sm font-medium">Kitchen</span>
                                    </Link>

                                    {/* Waiter Link */}
                                    <Link
                                        href={`/admin/waiter?slug=${restaurant.slug}`}
                                        className="flex flex-col items-center justify-center p-3 rounded-lg bg-gray-50 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 border border-transparent transition-all group"
                                    >
                                        <User className="w-6 h-6 text-gray-400 group-hover:text-purple-500 mb-2" />
                                        <span className="text-sm font-medium">Waiter</span>
                                    </Link>

                                    {/* Customer View Link */}
                                    <Link
                                        href={`/${restaurant.slug}?table=1`}
                                        target="_blank"
                                        className="flex flex-col items-center justify-center p-3 rounded-lg bg-gray-50 hover:bg-green-50 hover:text-green-700 hover:border-green-200 border border-transparent transition-all group"
                                    >
                                        <div className="relative">
                                            <Utensils className="w-6 h-6 text-gray-400 group-hover:text-green-500 mb-2" />
                                            <ExternalLink className="w-3 h-3 absolute -top-1 -right-2 text-gray-300 group-hover:text-green-400" />
                                        </div>
                                        <span className="text-sm font-medium">Customer</span>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
