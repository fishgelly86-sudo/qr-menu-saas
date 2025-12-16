"use client";
import AdminSidebar from "@/components/AdminSidebar";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useEffect, useState } from "react";
import { api } from "../../../../convex/_generated/api";

export default function ManagerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { signOut } = useAuthActions();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const session = localStorage.getItem("admin_session");
        if (!session) {
            router.replace("/admin/login");
        } else {
            setIsAuthorized(true);
        }
    }, [router]);

    if (!isAuthorized) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 font-medium animate-pulse">Verifying access...</p>
            </div>
        );
    }

    return (
        <DashboardShell children={children} />
    );
}

// Inner component to safely use queries
function DashboardShell({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    // Fetch current restaurant status
    const restaurant = useQuery(api.restaurants.getMyRestaurant);

    useEffect(() => {
        if (restaurant) {
            const isSuspended = restaurant.subscriptionStatus === "suspended";
            const isExpired = restaurant.subscriptionExpiresAt && Date.now() > restaurant.subscriptionExpiresAt;

            if (isSuspended || isExpired) {
                router.push("/admin/subscription-expired");
            }
        }
    }, [restaurant, router]);

    if (!restaurant) return null; // Or loading spinner

    // We just render the sidebar and children now, the logic moved to sidebar
    return (
        <div className="flex min-h-screen bg-gray-50 relative">
            <AdminSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
                    {children}
                </main>
            </div>
        </div>
    );
}


// Helper to handle the redirect effect cleanly
function RedirectToLogin() {
    const router = useRouter();
    useEffect(() => {
        router.push("/");
    }, [router]);
    return null;
}

