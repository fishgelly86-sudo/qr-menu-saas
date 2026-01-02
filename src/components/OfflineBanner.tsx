"use client";

import { useEffect, useState } from "react";
import { getQueue } from "../lib/offlineQueue";
import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflineBanner() {
    const [isOnline, setIsOnline] = useState(true);
    const [queueLength, setQueueLength] = useState(0);

    useEffect(() => {
        // Initial State
        if (typeof window !== "undefined") {
            setIsOnline(navigator.onLine);
            setQueueLength(getQueue().length);
        }

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        // Custom event from offlineQueue.ts
        const handleQueueUpdate = () => {
            setQueueLength(getQueue().length);
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        window.addEventListener("offline-queue-updated", handleQueueUpdate);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("offline-queue-updated", handleQueueUpdate);
        };
    }, []);

    if (isOnline && queueLength === 0) return null;

    return (
        <div className={`fixed bottom-0 left-0 right-0 p-3 text-white flex justify-center items-center gap-2 z-50 shadow-lg transition-colors ${!isOnline ? 'bg-red-600' : 'bg-yellow-600'}`}>
            {!isOnline ? (
                <>
                    <WifiOff className="w-4 h-4" />
                    <span className="text-sm font-medium">You are offline. {queueLength > 0 ? `${queueLength} order(s) queued.` : "Check your connection."}</span>
                </>
            ) : (
                <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">Syncing {queueLength} order(s)...</span>
                </>
            )}
        </div>
    );
}
