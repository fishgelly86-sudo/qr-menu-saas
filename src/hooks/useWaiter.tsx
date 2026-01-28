"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Id } from "../../convex/_generated/dataModel";

export interface WaiterSession {
    waiterId: Id<"waiters">;
    restaurantId: Id<"restaurants">;
    name: string;
    assignedTables?: Id<"tables">[];
    handlesTakeaway?: boolean;
}

export interface WaiterContextType {
    session: WaiterSession;
}

const WaiterContext = createContext<WaiterContextType | undefined>(undefined);

export function useWaiter() {
    const context = useContext(WaiterContext);
    if (!context) {
        throw new Error("useWaiter must be used within a WaiterContextProvider");
    }
    return context;
}

export function WaiterContextProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [session, setSession] = useState<WaiterSession | null>(null);

    useEffect(() => {
        const sessionStr = localStorage.getItem("waiter_session");
        if (!sessionStr) {
            router.replace("/waiter/login");
            return;
        }

        try {
            const parsed = JSON.parse(sessionStr);
            setSession(parsed);
        } catch (e) {
            localStorage.removeItem("waiter_session");
            router.replace("/waiter/login");
        }
    }, [router]);

    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <WaiterContext.Provider value={{ session }}>
            {children}
        </WaiterContext.Provider>
    );
}
