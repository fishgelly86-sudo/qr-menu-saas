"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useWaiter } from "../layout";
import { useLanguage } from "@/contexts/LanguageContext";

export default function WaiterDashboard() {
    const { session } = useWaiter();
    const { t } = useLanguage();

    // Fetch tables for the restaurant
    const tables = useQuery(api.tables.getTablesByRestaurant, { restaurantId: session.restaurantId });

    // Filter tables based on assignment
    // If assignedTables is undefined or empty, show ALL.
    const assignedTableIds = session.assignedTables;
    const hasSpecificAssignments = assignedTableIds && assignedTableIds.length > 0;

    const filteredTables = tables?.filter((table: any) => {
        if (table.isVirtual) return false; // Hide takeaway tables? Or maybe show them if assigned?
        if (!hasSpecificAssignments) return true;
        return assignedTableIds?.includes(table._id);
    });

    if (!tables) {
        return <div>Loading tables...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">
                    {hasSpecificAssignments ? "Your Tables" : "All Tables"}
                </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredTables?.map((table: any) => (
                    <div
                        key={table._id}
                        className={`
                            bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center space-y-2 border-t-4
                            ${table.status === "free" ? "border-green-500" :
                                table.status === "occupied" ? "border-blue-500" :
                                    table.status === "payment_pending" ? "border-orange-500" :
                                        "border-red-500"}
                        `}
                    >
                        <span className="text-2xl font-bold text-gray-900">
                            {table.number}
                        </span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full
                             ${table.status === "free" ? "bg-green-100 text-green-800" :
                                table.status === "occupied" ? "bg-blue-100 text-blue-800" :
                                    table.status === "payment_pending" ? "bg-orange-100 text-orange-800" :
                                        "bg-red-100 text-red-800"}
                        `}>
                            {t(table.status as any) || table.status}
                        </span>

                        {/* Placeholder for Order View - can link to detailed view */}
                        {table.status !== "free" && (
                            <button className="text-indigo-600 hover:text-indigo-800 text-sm mt-2">
                                View Order
                            </button>
                        )}
                    </div>
                ))}

                {filteredTables?.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        No tables assigned.
                    </div>
                )}
            </div>
        </div>
    );
}
