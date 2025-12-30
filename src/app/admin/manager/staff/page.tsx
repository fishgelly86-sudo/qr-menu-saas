"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useLanguage } from "@/contexts/LanguageContext";

export default function StaffManagementPage() {
    const { t } = useLanguage();
    const user = useQuery(api.auth.loggedInUser);
    const restaurants = useQuery(api.restaurants.listRestaurants);
    const restaurant = restaurants?.[0]; // Get first restaurant

    const isOwner = user && restaurant && user._id === restaurant.ownerId;

    const staff = useQuery(
        api.staffList.listAllStaffWithOwner,
        restaurant ? { restaurantId: restaurant._id } : "skip"
    );

    const claimOwnership = useMutation(api.fixes.claimBurgerBistro);

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

    const createInvite = useMutation(api.staff.createInvite);
    const revokeAccess = useMutation(api.staff.revokeAccess);

    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<"manager" | "waiter">("manager");
    const [inviteUrl, setInviteUrl] = useState("");
    const [loading, setLoading] = useState(false);

    const handleCreateInvite = async () => {
        if (!restaurant || !inviteEmail) return;

        setLoading(true);
        try {
            const result = await createInvite({
                restaurantId: restaurant._id,
                email: inviteEmail,
                role: inviteRole,
            });

            const fullUrl = `${window.location.origin}${result.inviteUrl}`;
            setInviteUrl(fullUrl);
            setInviteEmail("");
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (staffId: Id<"staff">) => {
        if (!confirm(t("revoke_staff_confirm"))) {
            return;
        }

        try {
            await revokeAccess({ staffId });
        } catch (error: any) {
            alert(error.message);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteUrl);
        alert(t("invite_link_copied"));
    };

    return (
        <div className="p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">{t("staff_management")}</h1>

                    {restaurant && !isOwner ? (
                        <button
                            onClick={handleClaimOwnership}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                        >
                            ⚠️ Fix Ownership (Admin)
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                        >
                            + {t("invite_staff")}
                        </button>
                    )}
                </div>

                {/* Staff List */}
                <div className="bg-white rounded-lg shadow">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase rtl:text-right">{t("name")}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase rtl:text-right">{t("email_label" as any) || "Email"}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase rtl:text-right">{t("role")}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase rtl:text-right">{t("status")}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase rtl:text-right">{t("actions_label" as any) || "Actions"}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {staff?.map((member) => (
                                <tr key={member._id}>
                                    <td className="px-6 py-4 text-sm text-gray-900">{member.name || "—"}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{member.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${member.role === "owner" ? "bg-purple-100 text-purple-800" :
                                            member.role === "manager" ? "bg-blue-100 text-blue-800" :
                                                "bg-gray-100 text-gray-800"
                                            }`}>
                                            {t(member.role as any) || member.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${member.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                            }`}>
                                            {member.isActive ? t("active") : t("revoked")}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {member.role === "owner" ? (
                                            <span className="text-xs text-gray-500">{t("cannot_revoke_owner")}</span>
                                        ) : member.isActive ? (
                                            <button
                                                onClick={() => handleRevoke(member._id)}
                                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                                            >
                                                {t("revoke")}
                                            </button>
                                        ) : (
                                            <span className="text-xs text-gray-500">{t("revoked")}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Invite Modal */}
                {showInviteModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full">
                            <h2 className="text-2xl font-bold mb-4">{t("invite_staff_member")}</h2>

                            {!inviteUrl ? (
                                <>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t("email_label" as any) || "Email"}
                                        </label>
                                        <input
                                            type="email"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                            placeholder="staff@example.com"
                                        />
                                    </div>

                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t("role")}
                                        </label>
                                        <select
                                            value={inviteRole}
                                            onChange={(e) => setInviteRole(e.target.value as "manager" | "waiter")}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                        >
                                            <option value="manager">{t("manager")}</option>
                                            <option value="waiter">{t("waiter")}</option>
                                        </select>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowInviteModal(false)}
                                            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                                        >
                                            {t("cancel")}
                                        </button>
                                        <button
                                            onClick={handleCreateInvite}
                                            disabled={loading || !inviteEmail}
                                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                                        >
                                            {loading ? t("creating") : t("create_invite")}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm text-gray-600 mb-4">
                                        {t("share_invite_link")}
                                    </p>
                                    <div className="bg-gray-50 p-3 rounded-lg mb-4 break-all text-sm">
                                        {inviteUrl}
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                setShowInviteModal(false);
                                                setInviteUrl("");
                                            }}
                                            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                                        >
                                            {t("close")}
                                        </button>
                                        <button
                                            onClick={copyToClipboard}
                                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                        >
                                            {t("copy_link")}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
