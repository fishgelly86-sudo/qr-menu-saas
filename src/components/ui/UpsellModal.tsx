import React, { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Plus, Check } from "lucide-react";
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
    onConfirm: (selectedIds: string[]) => void;
}

export function UpsellModal({ isOpen, onClose, upsellItems, onConfirm }: UpsellModalProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const { t } = useLanguage();

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleConfirm = () => {
        onConfirm(selectedIds);
        setSelectedIds([]); // Reset for next time
    };

    const totalExtra = selectedIds.reduce((sum, id) => {
        const item = upsellItems.find(i => i.id === id);
        return sum + (item?.price || 0);
    }, 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t("complete_your_meal")}>
            <div className="space-y-4">
                <p className="text-gray-600 text-sm">{t("would_you_like_extras")}</p>

                <div className="grid gap-3">
                    {upsellItems.map((item) => {
                        const isSelected = selectedIds.includes(item.id);
                        return (
                            <div
                                key={item.id}
                                onClick={() => toggleSelection(item.id)}
                                className={`
                                    relative flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                                    ${isSelected
                                        ? "border-[#D4AF37] bg-[#D4AF37]/5"
                                        : "border-gray-100 hover:border-[#D4AF37]/30 bg-white"
                                    }
                                `}
                            >
                                <div className={`
                                    w-6 h-6 rounded-full flex items-center justify-center border transition-colors
                                    ${isSelected ? "bg-[#D4AF37] border-[#D4AF37] text-white" : "border-gray-300 text-transparent"}
                                `}>
                                    <Check className="w-4 h-4" />
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
                        onClick={handleConfirm}
                        className={`w-full h-12 text-lg shadow-lg ${selectedIds.length === 0
                            ? "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
                            : "shadow-[#D4AF37]/20"
                            }`}
                    >
                        {selectedIds.length === 0
                            ? t("no_thanks_skip_extras")
                            : t("add_items", { count: selectedIds.length.toString() }) + ` (+${totalExtra.toFixed(2)} DA)`
                        }
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
