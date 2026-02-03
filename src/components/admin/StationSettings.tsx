"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";
import { Plus, Trash2, Save, Edit2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function StationSettings({ restaurantId, restaurantSlug }: { restaurantId: any, restaurantSlug: string }) {
    const stations = useQuery(api.stations.getStations,
        restaurantId ? { restaurantId } : "skip"
    );

    const menu = useQuery(api.restaurants.getAdminMenu, restaurantSlug ? { restaurantSlug } : "skip");

    const createStation = useMutation(api.stations.createStation);
    const updateStation = useMutation(api.stations.updateStation);
    const deleteStation = useMutation(api.stations.deleteStation);

    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");

    const { t, direction } = useLanguage();
    const isRtl = direction === "rtl";

    const handleCreate = async (name: string) => {
        if (!name.trim()) return;
        await createStation({
            restaurantId,
            name: name,
            isDefault: stations?.length === 0,
        });
        setIsCreating(false);
    };

    const handleUpdate = async (id: any) => {
        if (!editName.trim()) return;
        await updateStation({
            stationId: id,
            name: editName
        });
        setEditingId(null);
    };

    const handleDelete = async (id: any) => {
        if (confirm(t("delete_station_confirm"))) {
            await deleteStation({ stationId: id });
        }
    };

    return (
        <div className="space-y-4">
            <div className={`flex justify-between items-center ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">{t("kitchen_stations")}</h3>
                    <p className={`text-sm text-gray-500 mt-1 ${isRtl ? 'text-right' : ''}`}>
                        {t("kitchen_stations_desc")}
                    </p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm"
                >
                    <Plus size={16} />
                    {t("add_station")}
                </button>
            </div>

            <div className="grid gap-3">
                {stations?.map((station: any) => (
                    <div key={station._id} className={`bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-center group ${isRtl ? 'flex-row-reverse' : ''}`}>
                        {editingId === station._id ? (
                            <div className={`flex-1 flex gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 flex-1 text-sm"
                                    autoFocus
                                />
                                <button onClick={() => handleUpdate(station._id)} className="p-2 bg-green-50 text-green-600 rounded hover:bg-green-100">
                                    <Save size={16} />
                                </button>
                                <button onClick={() => setEditingId(null)} className="p-2 text-gray-400 hover:text-gray-600 text-sm">
                                    {t("cancel")}
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-lg">
                                        🧑‍🍳
                                    </div>
                                    <div className={isRtl ? 'text-right' : ''}>
                                        <h4 className="font-medium text-gray-900">{station.name}</h4>
                                        <div className="text-xs text-gray-500">
                                            {t("station_id")}: {station._id.slice(-6)}
                                            {station.isDefault && <span className={`ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ${isRtl ? 'mr-2 ml-0' : ''}`}>{t("default_badge")}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => {
                                            setEditingId(station._id);
                                            setEditName(station.name);
                                        }}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(station._id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}

                {isCreating && (
                    <div className="bg-gray-50 p-6 rounded-lg border border-dashed border-gray-300">
                        <div className={`flex justify-between items-center mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <label className="text-sm font-medium text-gray-700">{t("or_select_from_category")}</label>
                            <button onClick={() => setIsCreating(false)} className="text-xs text-gray-500 hover:text-gray-700 underline">
                                {t("cancel")}
                            </button>
                        </div>
                        <select
                            className={`w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm ${isRtl ? 'text-right' : ''}`}
                            onChange={(e) => {
                                if (e.target.value) handleCreate(e.target.value);
                            }}
                            value=""
                            autoFocus
                        >
                            <option value="">{t("select_category_as_name")}</option>
                            {menu?.categories?.map((c: any) => (
                                <option key={c._id} value={c.name} disabled={stations?.some((s: any) => s.name === c.name)}>
                                    {c.name} {stations?.some((s: any) => s.name === c.name) ? t("already_assigned") : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {stations?.length === 0 && !isCreating && (
                    <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">{t("no_stations_defined")}</p>
                        <p className="text-xs">{t("create_one_to_start")}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
