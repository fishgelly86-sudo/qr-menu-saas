import * as React from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "./Button";

export interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    hero?: React.ReactNode;
    headerContent?: React.ReactNode;
    footer?: React.ReactNode;
}

export function Drawer({ isOpen, onClose, children, title, hero, headerContent, footer }: DrawerProps) {
    const controls = useDragControls();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
                    />
                    <motion.div
                        drag="y"
                        dragListener={false}
                        dragControls={controls}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0.05, bottom: 1 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 100 || info.velocity.y > 500) {
                                onClose();
                            }
                        }}
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[95vh] flex flex-col shadow-2xl"
                    >
                        <div
                            onPointerDown={(e) => controls.start(e)}
                            className="flex items-center justify-between p-4 pb-2 border-b border-gray-100 flex-shrink-0 touch-none cursor-grab active:cursor-grabbing"
                        >
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto absolute left-0 right-0 top-3" />
                            <h2 className="text-lg font-bold text-gray-900 mt-2">{title}</h2>
                            <button
                                onClick={onClose}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors mt-2 z-10"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Hero Section - Draggable */}
                        {hero && (
                            <div
                                onPointerDown={(e) => controls.start(e)}
                                className="flex-shrink-0 touch-none cursor-grab active:cursor-grabbing"
                            >
                                {hero}
                            </div>
                        )}

                        {/* Header Content - Draggable */}
                        {headerContent && (
                            <div
                                onPointerDown={(e) => controls.start(e)}
                                className="flex-shrink-0 touch-none cursor-grab active:cursor-grabbing"
                            >
                                {headerContent}
                            </div>
                        )}

                        {/* Scrollable Content */}
                        <div className="overflow-y-auto p-4 pt-2 flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]">
                            {children}
                        </div>

                        {/* Footer - Fixed at bottom */}
                        {footer && (
                            <div className="p-4 border-t border-gray-100 bg-white pb-8">
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
