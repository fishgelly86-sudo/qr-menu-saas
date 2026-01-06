/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Calendar,
  Star,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { useRestaurant } from "../RestaurantContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AnalyticsPage() {
  const { restaurant } = useRestaurant();
  const { t, language } = useLanguage();
  const [viewMode, setViewMode] = useState<"overview" | "daily">("overview");
  const [dateRange, setDateRange] = useState<"today" | "7days" | "30days">("today");
  const [selectedDate, setSelectedDate] = useState<number>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });

  const calendarData = useQuery(
    api.analytics.getCalendarData,
    restaurant && viewMode === "daily" ? { restaurantId: restaurant._id, days: 30 } : "skip"
  );

  const { startTime, endTime } = useMemo(() => {
    if (viewMode === "daily") {
      const start = selectedDate;
      const end = selectedDate + 86399999; // End of the day
      return { startTime: start, endTime: end };
    }

    const now = new Date();
    const end = now.getTime();
    let start = new Date(now).setHours(0, 0, 0, 0);

    if (dateRange === "7days") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      start = d.setHours(0, 0, 0, 0);
    } else if (dateRange === "30days") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      start = d.setHours(0, 0, 0, 0);
    }
    return { startTime: start, endTime: end };
  }, [dateRange, viewMode, selectedDate]);

  const stats = useQuery(
    api.analytics.getDashboardStats,
    restaurant ? { restaurantId: restaurant._id, startTime, endTime } : "skip",
  ) as any;

  const getTimeLabel = (range: string) => {
    if (viewMode === "daily") {
      return new Date(selectedDate).toLocaleDateString(language, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    if (range === "today") return t("today").toUpperCase();
    if (range === "7days") return t("this_week");
    if (range === "30days") return t("this_month");
    return t("today").toUpperCase();
  };

  if (!restaurant || !stats)
    return <div className="p-8">{t("loading_status")}</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t("analytics_dashboard")}
          </h1>
          <p className="text-gray-500">
            {t("analytics_overview")}
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-center bg-white p-1 rounded-lg border border-gray-200 shadow-sm self-end">
            <button
              onClick={() => setViewMode("overview")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === "overview" ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
            >
              {t("overview")}
            </button>
            <button
              onClick={() => setViewMode("daily")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === "daily" ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
            >
              {t("daily_review")}
            </button>
          </div>

          {viewMode === "overview" && (
            <div className="flex items-center bg-white p-1 rounded-lg border border-gray-200 shadow-sm self-end">
              <button
                onClick={() => setDateRange("today")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${dateRange === "today" ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
              >
                {t("today")}
              </button>
              <button
                onClick={() => setDateRange("7days")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${dateRange === "7days" ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
              >
                {t("last_7_days")}
              </button>
              <button
                onClick={() => setDateRange("30days")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${dateRange === "30days" ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
              >
                {t("last_30_days")}
              </button>
            </div>
          )}
        </div>
      </header>

      {viewMode === "daily" && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              {t("select_date")}
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.getTime());
                }}
              >
                ← {t("previous_day")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.getTime());
                }}
                disabled={selectedDate >= new Date().setHours(0, 0, 0, 0)}
              >
                {t("next_day")} →
              </Button>
            </div>
          </div>

          <div className="flex gap-3 pb-4 min-w-max">
            {calendarData?.slice().reverse().map((day: any) => {
              const dateObj = new Date(day.date);
              const isSelected = day.date === selectedDate;
              return (
                <button
                  key={day.date}
                  onClick={() => setSelectedDate(day.date)}
                  className={`flex flex-col items-center p-3 rounded-xl border transition-all min-w-[80px] ${isSelected
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md transform scale-105"
                    : day.orderCount > 0
                      ? "bg-white border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
                      : "bg-gray-50 border-gray-100 opacity-60"
                    }`}
                >
                  <span className={`text-xs font-medium uppercase ${isSelected ? "text-indigo-100" : "text-gray-500"}`}>
                    {dateObj.toLocaleDateString(language, { weekday: 'short' })}
                  </span>
                  <span className="text-xl font-bold my-1">
                    {dateObj.getDate()}
                  </span>
                  <span className={`text-[10px] font-bold ${isSelected ? "text-white" : "text-green-600"}`}>
                    {day.orderCount > 0 ? `${restaurant.currency} ${day.revenue.toFixed(0)}` : "-"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === "daily" && stats.totalOrders === 0 && (
        <div className="bg-gray-50 p-12 rounded-xl border border-dashed border-gray-300 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">{t("no_data_for_date")}</h3>
          <p className="text-gray-500">{new Date(selectedDate).toLocaleDateString(language, { dateStyle: 'long' })}</p>
        </div>
      )}

      {(viewMode === "overview" || (viewMode === "daily" && stats.totalOrders > 0)) && (
        <>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                  {t("sales")} {getTimeLabel(dateRange)}
                </h3>
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {restaurant.currency} {stats.totalRevenue.toFixed(2)}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                  {t("orders")} {getTimeLabel(dateRange)}
                </h3>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ShoppingBag className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {stats.totalOrders}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {t("avg_order")}: {restaurant.currency}{" "}
                {(stats.totalRevenue / (stats.totalOrders || 1)).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Lists Row: Items & Extras */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Items List */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-emerald-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                  {t("top_selling_items")}
                </h3>
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Star className="w-5 h-5 text-emerald-600" />
                </div>
              </div>

              <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                {stats.popularItems && stats.popularItems.length > 0 ? (
                  stats.popularItems.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="font-bold text-gray-400 w-4">
                          #{idx + 1}
                        </div>
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-10 h-10 rounded-md object-cover border border-gray-100"
                          />
                        )}
                        <div>
                          <div className="font-medium text-gray-900 line-clamp-1">
                            {item.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {t("sold_count", { count: item.count.toString() })}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                        {restaurant.currency} {item.revenue.toFixed(2)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 italic text-center py-4">
                    {t("no_item_sales_data")}
                  </div>
                )}
              </div>
            </div>

            {/* Modifiers List */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-amber-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                  {t("top_extras")}
                </h3>
                <div className="p-2 bg-amber-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
              </div>

              <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                {stats.popularModifiers && stats.popularModifiers.length > 0 ? (
                  stats.popularModifiers.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="font-bold text-gray-400 w-4">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 line-clamp-1">
                            {item.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {t("sold_count", { count: item.count.toString() })}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        {restaurant.currency} {item.revenue.toFixed(2)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 italic text-center py-4">
                    {t("no_extras_sales_data")}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-6 text-center">
              {t("revenue_by_category")}
            </h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.revenueByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.revenueByCategory?.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [
                      `${restaurant.currency} ${value.toFixed(2)}`,
                      t("revenue"),
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
