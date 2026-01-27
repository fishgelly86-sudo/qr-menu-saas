"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Id } from "../../../convex/_generated/dataModel";

interface WaiterSession {
    waiterId: Id<"waiters">;
    restaurantId: Id<"restaurants">;
    name: string;
    assignedTables?: Id<"tables">[];
}

interface WaiterContextType {
    session: WaiterSession;
}

const WaiterContext = createContext<WaiterContextType | undefined>(undefined);

export function useWaiter() {
    const context = useContext(WaiterContext);
    if (!context) {
        throw new Error("useWaiter must be used within a WaiterLayout");
    }
    return context;
}

export default function WaiterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
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
            <div className="min-h-screen bg-gray-100">
                <header className="bg-white shadow">
                    <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                        <h1 className="text-xl font-bold text-gray-900">
                            Waiter: {session.name}
                        </h1>
                        <button
                            onClick={() => {
                                localStorage.removeItem("waiter_session");
                                router.push("/waiter/login");
                            }}
                            className="text-sm text-red-600 hover:text-red-800"
                        >
                            Logout
                        </button>
                    </div>
                </header>
                <main>
                    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>
            </div>
        </WaiterContext.Provider>
    );
}
