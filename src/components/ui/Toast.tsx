"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertCircle, X } from "lucide-react";

export interface ToastProps {
    message: string;
    type?: "success" | "error";
    isVisible: boolean;
    onClose: () => void;
    action?: React.ReactNode;
}

interface ToastContextType {
    showToast: (message: string, type?: "success" | "error", action?: React.ReactNode) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = React.useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toast, setToast] = React.useState<{ message: string; type: "success" | "error"; isVisible: boolean; action?: React.ReactNode }>({
        message: "",
        type: "success",
        isVisible: false,
    });

    const showToast = React.useCallback((message: string, type: "success" | "error" = "success", action?: React.ReactNode) => {
        setToast({ message, type, isVisible: true, action });
    }, []);

    const closeToast = React.useCallback(() => {
        setToast((prev) => ({ ...prev, isVisible: false }));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={closeToast}
                action={toast.action}
            />
        </ToastContext.Provider>
    );
}

export function Toast({ message, type = "success", isVisible, onClose, action }: ToastProps) {
    React.useEffect(() => {
        if (isVisible) {
            // If there is an action (like UNDO), maybe we want to keep it longer or let user dismiss?
            // For now, let's keep the auto-dismiss but make it slightly longer if there's an action
            const duration = action ? 10000 : 3000;
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose, action]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed bottom-6 left-4 right-4 z-[100] flex justify-center pointer-events-none"
                >
                    <div className={`
            flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg max-w-md w-full pointer-events-auto
            ${type === "success" ? "bg-gray-900 text-white" : "bg-red-600 text-white"}
          `}>
                        {type === "success" ? (
                            <Check className="w-5 h-5 flex-shrink-0 text-green-400" />
                        ) : (
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        )}
                        <p className="text-sm font-medium flex-1">{message}</p>
                        {action && (
                            <div className="flex-shrink-0">
                                {action}
                            </div>
                        )}
                        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
