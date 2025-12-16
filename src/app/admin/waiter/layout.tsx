"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function WaiterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const session = localStorage.getItem("admin_session");
        if (!session) {
            router.replace("/");
        } else {
            setIsAuthorized(true);
        }
    }, [router]);

    if (!isAuthorized) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 font-medium animate-pulse">Verifying access...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 text-gray-900">
            {children}
        </div>
    );
}
