import { Bell, BellRing, ChefHat, Clock, Utensils, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface OrderStatusProps {
    orders: any[];
    tableNumber: string | null;
    restaurantId: string;
    onStartNewOrder: () => void;
}

export function OrderStatus({ orders, tableNumber, restaurantId, onStartNewOrder }: OrderStatusProps) {
    const { t, direction } = useLanguage();
    const [showWaiterDialog, setShowWaiterDialog] = useState(false);
    const callWaiter = useMutation(api.waiterCalls.callWaiter);

    // Use the most recent order for status tracking
    const latestOrder = orders && orders.length > 0 ? orders[orders.length - 1] : null;

    if (!latestOrder) {
        return <div className="text-white">No active orders</div>;
    }

    const combinedTotal = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    const statusTranslations: Record<string, string> = {
        needs_approval: t("needs_approval_client") || 'Pending Approval',
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
            needs_approval: t("needs_approval_client") || 'Pending Approval',
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
        { status: "needs_approval", label: t("needs_approval_client"), icon: AlertTriangle },
        { status: "pending", label: t("order_sent") || "Order Placed", icon: Clock },
        { status: "preparing", label: t("chef_is_cooking") || "Preparing", icon: ChefHat },
        { status: "ready", label: t("ready_to_serve") || "Ready!", icon: Bell },
        { status: "served", label: t("bon_appetit") || "Bon Appétit", icon: Utensils },
    ];

    const currentStepIndex = steps.findIndex(s => s.status === latestOrder.status);
    const activeIndex = latestOrder.status === 'paid' ? 3 : (currentStepIndex === -1 ? 0 : currentStepIndex);

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
                    {latestOrder.status === 'needs_approval' && (
                        <p className="text-red-400 font-medium text-sm animate-pulse">
                            {t("call_waiter_hint")}
                        </p>
                    )}
                    <p className="text-[#f5f3f0]/80 font-light">
                        {t("table_no")} {tableNumber}
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

                    <div className="space-y-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {orders.map((order) => (
                            <div key={order._id} className="space-y-2">
                                <div className="text-xs text-white/30 uppercase tracking-widest mb-1 border-b border-white/5 pb-1">
                                    Order #{order._id.slice(-4)} • {getStatusLabel(order.status)}
                                </div>
                                {order.items.map((item: any, idx: number) => {
                                    // Calculate item total including modifiers
                                    const itemBaseTotal = (item.menuItem?.price || 0) * item.quantity;
                                    const modifiersTotal = item.modifiers?.reduce((sum: number, mod: any) => {
                                        const modifierPrice = mod.price || 0;
                                        return sum + (modifierPrice * mod.quantity);
                                    }, 0) || 0;
                                    const itemTotal = itemBaseTotal + modifiersTotal;

                                    return (
                                        <div key={idx} className="flex flex-col text-sm text-[#f5f3f0] mb-3 pb-2 border-b border-white/5 last:border-0 last:mb-0 last:pb-0">
                                            {/* Main Item Line */}
                                            <div className="flex justify-between items-baseline font-medium mb-1">
                                                <span className="text-base text-[#f5f3f0]">{item.menuItem?.name} <span className="text-[#D4AF37]">×{item.quantity}</span></span>
                                                <span className="text-[#f5f3f0]">{"DA"} {itemBaseTotal.toFixed(2)}</span>
                                            </div>

                                            {/* Unit Price Hint (if qty > 1) */}
                                            {item.quantity > 1 && (
                                                <div className="text-xs text-white/40 mb-2 -mt-1">
                                                    DA {item.menuItem?.price.toFixed(2)} {(t as any)("each") || "each"}
                                                </div>
                                            )}

                                            {/* Modifiers List */}
                                            {item.modifiers && item.modifiers.length > 0 && (
                                                <div className="space-y-1 mb-2">
                                                    {item.modifiers.map((mod: any, modIdx: number) => (
                                                        <div key={modIdx} className="flex justify-between text-sm text-[#D4AF37]/80 pl-2 border-l border-[#D4AF37]/20">
                                                            <span>{mod.name} {mod.quantity > 1 ? `×${mod.quantity}` : ''}</span>
                                                            <span>+ DA {(mod.price * mod.quantity).toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {item.notes && (
                                                <div className="text-xs text-white/50 italic mb-2 pl-2">
                                                    "{item.notes}"
                                                </div>
                                            )}

                                            {/* Item Total (only if modifiers exist) */}
                                            {item.modifiers && item.modifiers.length > 0 && (
                                                <div className="flex justify-end pt-1 border-t border-white/5">
                                                    <span className="text-xs text-white/40 uppercase tracking-widest mr-2 mt-0.5">{(t as any)("item_total") || "Item Total"}:</span>
                                                    <span className="text-sm font-bold text-[#D4AF37]">DA {itemTotal.toFixed(2)}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/10 flex justify-between text-[#D4AF37] font-bold text-lg">
                        <span>{t("total_amount")}</span>
                        <span>{"DA"} {combinedTotal.toFixed(2)}</span>
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
