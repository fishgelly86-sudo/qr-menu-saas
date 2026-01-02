import { api } from "../../convex/_generated/api";

const QUEUE_KEY = "offline_mutation_queue";

export interface QueuedMutation {
    id: string;
    mutation: string; // e.g. "orders.createOrder"
    args: any;
    timestamp: number;
}

export function saveToQueue(mutationName: string, args: any) {
    if (typeof window === "undefined") return;

    const queue = getQueue();
    const newItem: QueuedMutation = {
        id: crypto.randomUUID(),
        mutation: mutationName,
        args,
        timestamp: Date.now(),
    };

    queue.push(newItem);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

    // Trigger a custom event so UI can update immediately
    window.dispatchEvent(new Event("offline-queue-updated"));
}

export function getQueue(): QueuedMutation[] {
    if (typeof window === "undefined") return [];
    try {
        const item = localStorage.getItem(QUEUE_KEY);
        return item ? JSON.parse(item) : [];
    } catch (e) {
        console.error("Failed to parse queue", e);
        return [];
    }
}

export function clearQueueItem(id: string) {
    if (typeof window === "undefined") return;

    const queue = getQueue();
    const newQueue = queue.filter(item => item.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));

    window.dispatchEvent(new Event("offline-queue-updated"));
}

export async function syncQueue(convexClient: any) {
    if (typeof window === "undefined" || !navigator.onLine) return;

    const queue = getQueue();
    if (queue.length === 0) return;

    console.log(`Syncing ${queue.length} items...`);

    for (const item of queue) {
        try {
            // Execute mutation based on name
            // NOTE: This requires a mapping or dynamic access if using string names.
            // For safety, we might hardcode the supported offline mutations here or pass the function map.
            // Since we primarily care about createOrder, let's look it up.

            if (item.mutation === "orders:createOrder") {
                await convexClient.mutation(api.orders.createOrder, item.args);
            } else {
                console.warn("Unknown mutation in queue:", item.mutation);
            }

            // Success! Remove from queue
            clearQueueItem(item.id);
        } catch (error) {
            console.error("Failed to sync item", item.id, error);
            // Wait a bit before next retry? Or just stop syncing current batch?
            // For now, we continue trying others, or break if it's a network error.
            // If it's a logic error (price mismatch), we might want to alert the user? 
            // But purely background sync is hard for UI feedback.
            // Ideally, we keep it in queue until user clears it or we have sophisticated retry.
        }
    }
}
