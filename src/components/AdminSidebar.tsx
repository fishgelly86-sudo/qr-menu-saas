"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Menu, UtensilsCrossed, BarChart3, ExternalLink, X } from "lucide-react";
import clsx from "clsx";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";

interface AdminSidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { signOut } = useAuthActions();
    const { isAuthenticated } = useConvexAuth();
    const restaurant = useQuery(api.restaurants.getMyRestaurant, isAuthenticated ? {} : "skip");
    const updateRestaurant = useMutation(api.restaurants.updateRestaurant);

    const toggleStatus = async () => {
        if (!restaurant) return;
        await updateRestaurant({
            id: restaurant._id,
            isAcceptingOrders: !restaurant.isAcceptingOrders
        });
    };

    const links = [
        { name: "Dashboard", href: "/admin/manager", icon: LayoutDashboard },
        { name: "Menu Management", href: "/admin/manager/menu", icon: Menu },
        { name: "Tables", href: "/admin/manager/tables", icon: UtensilsCrossed },
        { name: "Analytics", href: "/admin/manager/analytics", icon: BarChart3 },
    ];

    return (
        <>
            {/* Mobile Backdrop */}
            <div
                className={clsx(
                    "fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity lg:hidden z-40",
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar container */}
            <div className={clsx(
                "fixed inset-y-0 left-0 flex flex-col w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 z-50",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
                    <span className="text-xl font-bold text-gray-900">Admin Portal</span>
                    <button
                        onClick={onClose}
                        className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-900 focus:outline-none"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto py-4">
                    <nav className="px-2 space-y-1">
                        {links.map((link) => {
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    onClick={() => onClose?.()}
                                    className={clsx(
                                        "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                                        isActive
                                            ? "bg-gray-100 text-gray-900"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                >
                                    <link.icon
                                        className={clsx(
                                            "mr-3 h-5 w-5 flex-shrink-0",
                                            isActive ? "text-gray-500" : "text-gray-400 group-hover:text-gray-500"
                                        )}
                                    />
                                    {link.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Restaurant Status Toggle & Logout */}
                <div className="p-4 border-t border-gray-200 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <span className={`text-sm font-medium ${restaurant?.isAcceptingOrders ? "text-green-600" : "text-red-600"}`}>
                            {restaurant?.isAcceptingOrders ? "Open" : "Closed"}
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={restaurant?.isAcceptingOrders ?? false}
                                onChange={toggleStatus}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                        </label>
                    </div>

                    <button
                        onClick={() => {
                            signOut();
                            router.push("/admin/login");
                        }}
                        className="flex items-center w-full px-2 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md"
                    >
                        <ExternalLink className="mr-3 h-5 w-5 transform rotate-180" /> {/* Simulating logout icon */}
                        Log Out
                    </button>

                    <Link
                        href="/admin/kitchen"
                        target="_blank"
                        className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm"
                    >
                        Kitchen Mode
                        <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                </div>
            </div>
        </>
    );
}
