"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, WifiOff } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function OfflineBanner() {
    const [isOffline, setIsOffline] = useState(false);
    const { t } = useLanguage();

    useEffect(() => {
        // Set initial state
        setIsOffline(!navigator.onLine);

        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    if (!isOffline) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-red-600 text-white p-4 shadow-lg animate-in slide-in-from-bottom duration-300">
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 text-center">
                <WifiOff className="w-6 h-6 shrink-0 animate-pulse" />
                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                    <span className="font-bold text-lg">
                        {(t as any)("offline_warning_title") || "YOU ARE OFFLINE"}
                    </span>
                    <span className="text-sm sm:text-base">
                        {(t as any)("offline_warning_msg") || "Orders will sync when internet returns. DO NOT CLOSE THIS PAGE!"}
                    </span>
                </div>
            </div>
        </div>
    );
}
