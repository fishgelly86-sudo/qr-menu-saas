"use client";

import { useState } from "react";
import { useRestaurant } from "../RestaurantContext";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Save, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

import StaffSettings from "@/components/admin/StaffSettings";
import StationSettings from "@/components/admin/StationSettings";

export default function SettingsPage() {
    const { restaurant } = useRestaurant();
    const updateRestaurant = useMutation(api.restaurants.updateRestaurant);
    const { t } = useLanguage();

    // Local state for optimistic UI (optional, but good for toggles)
    const [isUpdating, setIsUpdating] = useState(false);

    if (!restaurant) return <div>Loading...</div>;

    const toggleApproval = async () => {
        setIsUpdating(true);
        try {
            await updateRestaurant({
                id: restaurant._id,
                settings: {
                    requireOrderApproval: !restaurant.settings?.requireOrderApproval
                }
            });
        } catch (error) {
            console.error("Failed to update settings", error);
            alert("Failed to update settings");
        } finally {
            setIsUpdating(false);
        }
    };

    const toggleKitchenStations = async () => {
        setIsUpdating(true);
        try {
            await updateRestaurant({
                id: restaurant._id,
                settings: {
                    enableKitchenStations: !restaurant.settings?.enableKitchenStations
                }
            });
        } catch (error) {
            console.error("Failed to update settings", error);
            alert("Failed to update settings");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("store_settings")}</h1>

                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-indigo-500" />
                            {t("order_verification")}
                        </h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                            {t("order_verification_desc")}
                        </p>
                    </div>
                    <div className="px-4 py-5 sm:p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900">{t("require_manager_approval")}</span>
                                <span className="text-sm text-gray-500">
                                    {t("require_manager_approval_desc")}
                                </span>
                            </div>
                            <button
                                dir="ltr"
                                onClick={toggleApproval}
                                disabled={isUpdating}
                                className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${restaurant.settings?.requireOrderApproval ? 'bg-indigo-600' : 'bg-gray-200'
                                    }`}
                            >
                                <span className="sr-only">Use setting</span>
                                <span
                                    aria-hidden="true"
                                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${restaurant.settings?.requireOrderApproval ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Kitchen Stations Section */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                        🧑‍🍳 {t("multi_kitchen_management")}
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        {t("multi_kitchen_desc")}
                    </p>
                </div>
                <div className="px-4 py-5 sm:p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">{t("enable_kitchen_stations")}</span>
                            <span className="text-sm text-gray-500">
                                {t("enable_kitchen_stations_desc")}
                            </span>
                        </div>
                        <button
                            dir="ltr"
                            onClick={toggleKitchenStations}
                            disabled={isUpdating}
                            className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${restaurant.settings?.enableKitchenStations ? 'bg-indigo-600' : 'bg-gray-200'
                                }`}
                        >
                            <span className="sr-only">{t("enable_kitchen_stations")}</span>
                            <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${restaurant.settings?.enableKitchenStations ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                            />
                        </button>
                    </div>

                    {restaurant.settings?.enableKitchenStations && (
                        <div className="pt-4 border-t border-gray-200">
                            <StationSettings restaurantId={restaurant._id} restaurantSlug={restaurant.slug} />
                        </div>
                    )}
                </div>
            </div>

            {/* Staff Management Section */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <StaffSettings />
                </div>
            </div>
        </div>
    );
}
