"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Menu, UtensilsCrossed, BarChart3, ExternalLink } from "lucide-react";
import clsx from "clsx";

export default function AdminSidebar() {
    const pathname = usePathname();

    const links = [
        { name: "Dashboard", href: "/admin/manager", icon: LayoutDashboard },
        { name: "Menu Management", href: "/admin/manager/menu", icon: Menu },
        { name: "Tables", href: "/admin/manager/tables", icon: UtensilsCrossed },
        { name: "Analytics", href: "/admin/manager/analytics", icon: BarChart3 },
    ];

    return (
        <div className="flex flex-col w-64 bg-white border-r border-gray-200 min-h-screen">
            <div className="flex items-center justify-center h-16 border-b border-gray-200">
                <span className="text-xl font-bold text-gray-900">Admin Portal</span>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
                <nav className="px-2 space-y-1">
                    {links.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.name}
                                href={link.href}
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
            <div className="p-4 border-t border-gray-200">
                <Link
                    href="/admin/kitchen"
                    target="_blank"
                    className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm"
                >
                    Launch Kitchen Mode
                    <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
            </div>
        </div>
    );
}
