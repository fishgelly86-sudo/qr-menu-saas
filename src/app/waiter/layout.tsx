"use client";

import { useRouter } from "next/navigation";
import { WaiterContextProvider, useWaiter } from "../../hooks/useWaiter";

export default function WaiterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // We can't access useWaiter here directly if we want to use the session for the header
    // so we need to split this into a wrapper and an inner component.

    return (
        <WaiterContextProvider>
            <WaiterHeaderAndContent>
                {children}
            </WaiterHeaderAndContent>
        </WaiterContextProvider>
    );
}

function WaiterHeaderAndContent({ children }: { children: React.ReactNode }) {
    const { session } = useWaiter();
    const router = useRouter();

    return (
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
    );
}
