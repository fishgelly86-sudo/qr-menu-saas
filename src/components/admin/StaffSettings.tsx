"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useLanguage } from "@/contexts/LanguageContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";
import { useRestaurant } from "../../app/admin/manager/RestaurantContext";

export default function StaffSettings() {
    const { t } = useLanguage();
    const { restaurant } = useRestaurant();
    const user = useQuery(api.auth.loggedInUser);

    // We already have "restaurant" from context, so we don't need listRestaurants

    // Check ownership
    const isOwner = user && restaurant && user._id === restaurant.ownerId;

    // Use Waiters API
    const tables = useQuery(api.tables.getTablesByRestaurant, restaurant ? { restaurantId: restaurant._id } : "skip");

    const claimOwnership = useMutation(api.fixes.claimBurgerBistro);

    // Waiter Management States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newWaiterName, setNewWaiterName] = useState("");
    const [newWaiterPassword, setNewWaiterPassword] = useState("");
    const [newWaiterTables, setNewWaiterTables] = useState<string[]>([]);
    const [isCreatingWaiter, setIsCreatingWaiter] = useState(false);

    // Assignment States (for editing existing waiters)
    const [editingAssignment, setEditingAssignment] = useState<any>(null);
    const [selectedTables, setSelectedTables] = useState<string[]>([]);
    const [isSavingAssignment, setIsSavingAssignment] = useState(false);

    // Queries & Mutations
    const waiters = useQuery(api.waiters.listWaiters, restaurant ? { restaurantId: restaurant._id } : "skip");
    const createWaiter = useMutation(api.waiters.createWaiter);
    const updateWaiter = useMutation(api.waiters.updateWaiter);
    const deleteWaiter = useMutation(api.waiters.deleteWaiter);

    // Handlers
    const handleClaimOwnership = async () => {
        if (!restaurant) return;
        try {
            await claimOwnership({});
            alert(t("ownership_claimed"));
            window.location.reload();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleAddWaiter = async () => {
        if (!restaurant || !newWaiterName || !newWaiterPassword) return;
        setIsCreatingWaiter(true);
        try {
            await createWaiter({
                restaurantId: restaurant._id,
                name: newWaiterName,
                password: newWaiterPassword,
                assignedTables: newWaiterTables.length > 0 ? (newWaiterTables as any) : undefined,
            });
            setIsAddModalOpen(false);
            setNewWaiterName("");
            setNewWaiterPassword("");
            setNewWaiterTables([]);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsCreatingWaiter(false);
        }
    };

    const handleDeleteWaiter = async (waiterId: Id<"waiters">) => {
        if (!confirm(t("revoke_staff_confirm"))) return;
        try {
            await deleteWaiter({ waiterId });
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleOpenAssignment = (waiter: any) => {
        setEditingAssignment(waiter);
        setSelectedTables(waiter.assignedTables || []);
    };

    const handleSaveAssignment = async () => {
        if (!editingAssignment) return;
        setIsSavingAssignment(true);
        try {
            await updateWaiter({
                waiterId: editingAssignment._id,
                assignedTables: selectedTables.length > 0 ? (selectedTables as any) : undefined,
            });
            setEditingAssignment(null);
        } catch (error) {
            console.error(error);
            alert("Failed to update assignments");
        } finally {
            setIsSavingAssignment(false);
        }
    };

    const toggleNewWaiterTable = (tableId: string) => {
        setNewWaiterTables(prev => {
            if (prev.includes(tableId)) return prev.filter(id => id !== tableId);
            return [...prev, tableId];
        });
    };

    const toggleTableSelection = (tableId: string) => {
        setSelectedTables(prev => {
            if (prev.includes(tableId)) return prev.filter(id => id !== tableId);
            return [...prev, tableId];
        });
    };

    if (!restaurant) return null;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{t("staff_management")}</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">Manage access for waiters.</p>
                    {restaurant?.ownerEmail && (
                        <p className="mt-1 text-sm text-gray-500 bg-gray-50 p-2 rounded border inline-block">
                            <strong>Waiter Login Email:</strong> {restaurant.ownerEmail}
                        </p>
                    )}
                </div>

                {restaurant && !isOwner ? (
                    <button
                        onClick={handleClaimOwnership}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                    >
                        Fix Ownership
                    </button>
                ) : (
                    <Button onClick={() => setIsAddModalOpen(true)} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Waiter
                    </Button>
                )}
            </div>

            {/* Waiters List */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase rtl:text-right">{t("name")}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase rtl:text-right">Assigned Tables</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase rtl:text-right">{t("actions_label" as any) || "Actions"}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {waiters?.map((waiter) => (
                            <tr key={waiter._id}>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                    {waiter.name}
                                    {waiter.isDefault && <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Default</span>}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {!waiter.assignedTables || waiter.assignedTables.length === 0
                                        ? t("all_tables_option")
                                        : `${waiter.assignedTables.length} ${t("tables_management")}`}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleOpenAssignment(waiter)}
                                            className="border-blue-200 text-blue-600 hover:bg-blue-50"
                                        >
                                            {t("edit_assign_btn")}
                                        </Button>
                                        <button
                                            onClick={() => handleDeleteWaiter(waiter._id)}
                                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                                        >
                                            {t("delete")}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {waiters?.length === 0 && (
                            <tr>
                                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                    {t("no_waiters_msg")}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Waiter Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title={t("add_waiter_title")}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t("name")}</label>
                        <input
                            type="text"
                            value={newWaiterName}
                            onChange={(e) => setNewWaiterName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 placeholder:text-gray-400"
                            placeholder="e.g. John Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t("password_label")}</label>
                        <input
                            type="text"
                            value={newWaiterPassword}
                            onChange={(e) => setNewWaiterPassword(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 placeholder:text-gray-400"
                            placeholder={t("password_label")}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t("assign_tables_label")}</label>
                        <p className="text-xs text-gray-500 mb-2">{t("assign_tables_hint")}</p>
                        <div className="max-h-[150px] overflow-y-auto grid grid-cols-3 gap-2 p-2 border rounded-lg bg-gray-50">
                            {tables?.filter((t: any) => !t.isVirtual).map((table: any) => (
                                <button
                                    key={table._id}
                                    onClick={() => toggleNewWaiterTable(table._id)}
                                    className={`
                                        p-2 rounded border text-sm font-medium transition-colors
                                        ${newWaiterTables.includes(table._id)
                                            ? "bg-blue-100 border-blue-500 text-blue-700"
                                            : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                                        }
                                    `}
                                >
                                    Table {table.number}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-4">
                        <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleAddWaiter}
                            disabled={isCreatingWaiter || !newWaiterName || !newWaiterPassword}
                        >
                            {isCreatingWaiter ? "Creating..." : "Create Waiter"}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Edit Assignment Modal */}
            <Modal
                isOpen={!!editingAssignment}
                onClose={() => setEditingAssignment(null)}
                title={`Edit Waiter: ${editingAssignment?.name}`}
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                        Select which tables this waiter is responsible for. If no tables are selected, they will receive notifications for ALL tables.
                    </p>

                    <div className="max-h-[300px] overflow-y-auto grid grid-cols-3 gap-2 p-2 border rounded-lg bg-gray-50">
                        {tables?.filter((t: any) => !t.isVirtual).map((table: any) => (
                            <button
                                key={table._id}
                                onClick={() => toggleTableSelection(table._id)}
                                className={`
                                    p-2 rounded border text-sm font-medium transition-colors
                                    ${selectedTables.includes(table._id)
                                        ? "bg-blue-100 border-blue-500 text-blue-700"
                                        : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                                    }
                                `}
                            >
                                Table {table.number}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-2 justify-end pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setEditingAssignment(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveAssignment}
                            disabled={isSavingAssignment}
                        >
                            {isSavingAssignment ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
