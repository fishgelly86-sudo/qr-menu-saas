import React, { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Plus, Minus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export interface UpsellItem {
    id: string;
    name: string;
    price: number;
    description: string;
    savings?: string;
}

interface UpsellModalProps {
    isOpen: boolean;
    onClose: () => void;
    upsellItems: UpsellItem[];
    initialQuantities?: Record<string, number>;
    onConfirm: (upsellSelections: { id: string; quantity: number }[]) => void;
}

const EMPTY_QUANTITIES: Record<string, number> = {};

export function UpsellModal({ isOpen, onClose, upsellItems, initialQuantities = EMPTY_QUANTITIES, onConfirm }: UpsellModalProps) {
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const { t } = useLanguage();

    useEffect(() => {
        if (isOpen) {
            setQuantities(initialQuantities);
        }
    }, [isOpen, initialQuantities]);

    const handleQuantityChange = (id: string, delta: number) => {
        setQuantities(prev => {
            const current = prev[id] || 0;
            const next = Math.max(0, current + delta);
            if (next === 0) {
                const { [id]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [id]: next };
        });
    };

    const handleConfirm = () => {
        const selections = Object.entries(quantities).map(([id, quantity]) => ({
            id,
            quantity
        }));
        onConfirm(selections);
    };

    const totalExtra = Object.entries(quantities).reduce((sum, [id, qty]) => {
        const item = upsellItems.find(i => i.id === id);
        return sum + (item?.price || 0) * qty;
    }, 0);

    const totalCount = Object.values(quantities).reduce((a, b) => a + b, 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t("complete_your_meal")}>
            <div className="space-y-4">
                <p className="text-gray-600 text-sm">{t("would_you_like_extras")}</p>

                <div className="grid gap-3">
                    {upsellItems.map((item) => {
                        const quantity = quantities[item.id] || 0;
                        const isSelected = quantity > 0;

                        return (
                            <div
                                key={item.id}
                                onClick={() => handleQuantityChange(item.id, 1)}
                                className={`
                                    relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer
                                    ${isSelected
                                        ? "border-[#D4AF37] bg-[#D4AF37]/5"
                                        : "border-gray-100 bg-white hover:border-[#D4AF37]/50"
                                    }
                                `}
                            >
                                {/* Quantity Controls */}
                                <div className="flex items-center gap-2">
                                    {isSelected ? (
                                        <div className="flex items-center gap-2 bg-white rounded-lg border border-[#D4AF37] p-1 shadow-sm">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleQuantityChange(item.id, -1);
                                                }}
                                                className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-[#1a1a2e]"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="w-4 text-center text-black font-bold text-sm">{quantity}</span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleQuantityChange(item.id, 1);
                                                }}
                                                className="w-6 h-6 flex items-center justify-center rounded bg-[#D4AF37] text-white hover:bg-[#c4a027]"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleQuantityChange(item.id, 1);
                                            }}
                                            className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-300 text-gray-400 hover:border-[#D4AF37] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-bold text-[#1a1a2e]">{item.name}</h4>
                                        <span className="font-bold text-[#D4AF37]">{item.price.toFixed(2)} DA</span>
                                    </div>
                                    <p className="text-xs text-gray-500">{item.description}</p>
                                </div>

                                {item.savings && (
                                    <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                        {item.savings}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="pt-4 mt-2 border-t border-gray-100">
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        className={`w-full h-12 text-lg shadow-lg ${totalCount === 0
                            ? "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
                            : "shadow-[#D4AF37]/20 bg-[#D4AF37] hover:bg-[#c4a027] text-white"
                            }`}
                    >
                        {totalCount === 0
                            ? t("no_thanks_skip_extras")
                            : t("add_items", { count: totalCount.toString() }) + ` (+${totalExtra.toFixed(2)} DA)`
                        }
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
