import { useMutation } from "convex/react";
import { useState, useCallback, useEffect } from "react";
import { saveToQueue, syncQueue, getQueue } from "../lib/offlineQueue";
import { useConvex } from "convex/react";

export function useSafeMutation(mutation: any, mutationName: string) {
    const convexMutation = useMutation(mutation);
    const convexClient = useConvex();
    const [error, setError] = useState<Error | null>(null);
    const [isPending, setIsPending] = useState(false);

    // Auto-sync on mount and when coming online
    useEffect(() => {
        const handleOnline = () => {
            syncQueue(convexClient);
        };

        // Sync immediately if we have items
        if (navigator.onLine && getQueue().length > 0) {
            syncQueue(convexClient);
        }

        window.addEventListener("online", handleOnline);
        return () => window.removeEventListener("online", handleOnline);
    }, [convexClient]);

    const mutate = useCallback(async (args: any) => {
        setIsPending(true);
        setError(null);

        try {
            if (!navigator.onLine) {
                throw new Error("OFFLINE_MODE");
            }

            const result = await convexMutation(args);
            setIsPending(false);
            return { success: true, data: result, queued: false };
        } catch (err: any) {
            console.error("Mutation failed:", err);

            // Check if it's a network error or explicitly "OFFLINE_MODE"
            // Convex errors can be tricky, but typical fetch failures or offline status are what we catch via logic.
            const isNetworkError = err.message === "OFFLINE_MODE" ||
                err.message?.includes("Network request failed") ||
                err.message?.includes("Failed to fetch");

            if (isNetworkError) {
                // Queue it!
                saveToQueue(mutationName, args);
                setIsPending(false);
                return { success: true, data: null, queued: true }; // Optimistic success
            }

            // Actual server error (e.g. Price Mismatch)
            setError(err);
            setIsPending(false);
            throw err; // Re-throw so UI can handle logic errors
        }
    }, [convexMutation, mutationName]);

    return { mutate, error, isPending };
}
