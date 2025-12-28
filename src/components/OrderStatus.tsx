import { Bell, BellRing, ChefHat, Clock, Utensils } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface OrderStatusProps {
    order: any;
    tableNumber: string | null;
    restaurantId: string;
    onStartNewOrder: () => void;
}

export function OrderStatus({ order, tableNumber, restaurantId, onStartNewOrder }: OrderStatusProps) {
    const { t, direction } = useLanguage();
    const [showWaiterDialog, setShowWaiterDialog] = useState(false);
    const callWaiter = useMutation(api.waiterCalls.callWaiter); // Need to pass calls or use mutation here

    const statusTranslations: Record<string, string> = {
        pending: 'قيد الانتظار',
        preparing: 'قيد التحضير',
        ready: 'جاهز',
        served: 'تم التقديم',
        paid: 'مدفوع',
        cancelled: 'ملغى'
    };

    const getStatusLabel = (status: string) => {
        const lower = status.toLowerCase();
        if (direction === 'rtl' && statusTranslations[lower]) { // Check rtl or language
            return statusTranslations[lower];
        }
        const englishLabels: Record<string, string> = {
            pending: 'Order Placed',
            preparing: 'Preparing',
            ready: 'Ready',
            served: 'Served',
            paid: 'Paid',
            cancelled: 'Cancelled'
        };
        return englishLabels[lower] || status.toUpperCase();
    };

    const steps = [
        { status: "pending", label: t("order_sent") || "Order Placed", icon: Clock },
        { status: "preparing", label: t("chef_is_cooking") || "Preparing", icon: ChefHat },
        { status: "ready", label: t("ready_to_serve") || "Ready!", icon: Bell },
        { status: "served", label: t("bon_appetit") || "Bon Appétit", icon: Utensils },
    ];

    const currentStepIndex = steps.findIndex(s => s.status === order.status);
    const activeIndex = order.status === 'paid' ? 3 : (currentStepIndex === -1 ? 0 : currentStepIndex);

    const handleCallWaiter = async (type: "bill" | "help") => {
        if (!restaurantId || !tableNumber) return;
        try {
            await callWaiter({
                restaurantId: restaurantId as any,
                tableNumber: tableNumber,
                type
            });
            setShowWaiterDialog(false);
            // Optionally show toast success via context or prop if needed, 
            // but component can handle own state or be silent? 
            // Let's assume simpler for now or use window alert/toast if available.
        } catch (error) {
            console.error("Failed call waiter", error);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#1a1a2e] p-6 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#D4AF37_0%,_transparent_70%)] opacity-10" />

            <div className="w-full max-w-md space-y-8 relative z-10">
                {/* Status Icon */}
                <div className="flex justify-center">
                    <div className="w-32 h-32 bg-[#D4AF37]/10 rounded-full flex items-center justify-center border-2 border-[#D4AF37] animate-pulse">
                        {(() => {
                            const Icon = steps[activeIndex].icon;
                            return <Icon className="w-16 h-16 text-[#D4AF37]" />;
                        })()}
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-serif text-[#D4AF37] font-bold">
                        {steps[activeIndex].label}
                    </h1>
                    <p className="text-[#f5f3f0]/80 font-light">
                        {t("table_no")} {tableNumber} • Order #{order._id.slice(-4)}
                    </p>
                </div>

                {/* Stepper */}
                <div className="relative flex justify-between items-center px-4 mt-12 mb-8">
                    {/* Connecting Line */}
                    <div className="absolute left-4 right-4 top-1/2 h-0.5 bg-gray-700 -z-10" />
                    <div
                        className="absolute left-4 top-1/2 h-0.5 bg-[#D4AF37] -z-10 transition-all duration-500"
                        style={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
                    />

                    {steps.map((step, idx) => {
                        const isCompleted = idx <= activeIndex;
                        const isCurrent = idx === activeIndex;
                        const Icon = step.icon;

                        return (
                            <div key={step.status} className="flex flex-col items-center gap-2 bg-[#1a1a2e] px-2">
                                <div className={`
                                    w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                                    ${isCompleted ? "bg-[#D4AF37] border-[#D4AF37] text-[#1a1a2e]" : "bg-[#1a1a2e] border-gray-600 text-gray-600"}
                                    ${isCurrent ? "scale-125 shadow-[0_0_15px_rgba(212,175,55,0.5)]" : ""}
                                `}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isCompleted ? "text-[#D4AF37]" : "text-gray-600"}`}>
                                    {getStatusLabel(step.status)}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Order Details Preview */}
                <div className="bg-white/5 rounded-xl p-4 text-left border border-white/10 mt-8">
                    <h3 className="text-[#D4AF37] text-sm font-bold uppercase tracking-wider mb-3 border-b border-white/10 pb-2">{t("your_order")}</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {order.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex flex-col text-sm text-[#f5f3f0] mb-2">
                                <div className="flex justify-between">
                                    <span>{item.quantity}x {item.menuItem?.name}</span>
                                    <span className="text-white/60">{"DA"} {(item.menuItem?.price * item.quantity).toFixed(2)}</span>
                                </div>
                                {item.notes && (
                                    <span className="text-xs text-[#D4AF37] italic pl-4">Note: {item.notes}</span>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 pt-2 border-t border-white/10 flex justify-between text-[#D4AF37] font-bold">
                        <span>{t("total_amount")}</span>
                        <span>{"DA"} {order.totalAmount.toFixed(2)}</span>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <Button
                        onClick={() => setShowWaiterDialog(true)}
                        variant="ghost"
                        className="flex-1 border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                    >
                        <BellRing className="w-4 h-4 mr-2" />
                        {t("call_waiter")}
                    </Button>
                    <Button
                        onClick={onStartNewOrder}
                        variant="outline"
                        className="flex-1 border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#1a1a2e]"
                    >
                        {(t as any)("browse_menu") || "Browse Menu"}
                    </Button>
                </div>
                <div className="mt-4">
                    <Button
                        onClick={onStartNewOrder}
                        variant="ghost"
                        className="w-full text-xs text-[#D4AF37]/70 hover:text-[#D4AF37]"
                    >
                        + {(t as any)("add_more_items") || "Add more items"}
                    </Button>
                </div>
            </div>

            {/* Re-use Waiter Modal inside Success View */}
            <Modal
                isOpen={showWaiterDialog}
                onClose={() => setShowWaiterDialog(false)}
                title={t("concierge_service")}
            >
                <div className="grid grid-cols-1 gap-4">
                    <button
                        onClick={() => handleCallWaiter("bill")}
                        className="flex items-center gap-4 p-5 rounded-2xl bg-[#f5f3f0] border border-transparent hover:border-[#D4AF37] hover:bg-white hover:shadow-lg transition-all group"
                    >
                        <span className="text-3xl group-hover:scale-110 transition-transform">💳</span>
                        <div className={`text-left ${direction === 'rtl' ? 'text-right' : ''}`}>
                            <div className="font-serif font-bold text-[#1a1a2e]">{t("request_bill")}</div>
                            <div className="text-xs text-gray-500">{t("ready_to_settle")}</div>
                        </div>
                    </button>
                    <button
                        onClick={() => handleCallWaiter("help")}
                        className="flex items-center gap-4 p-5 rounded-2xl bg-[#f5f3f0] border border-transparent hover:border-[#D4AF37] hover:bg-white hover:shadow-lg transition-all group"
                    >
                        <span className="text-3xl group-hover:scale-110 transition-transform">🛎️</span>
                        <div className={`text-left ${direction === 'rtl' ? 'text-right' : ''}`}>
                            <div className="font-serif font-bold text-[#1a1a2e]">{t("call_server")}</div>
                            <div className="text-xs text-gray-500">{t("general_assistance")}</div>
                        </div>
                    </button>
                </div>
            </Modal>
        </div>
    );
}
