"use client";
import AdminSidebar from "@/components/AdminSidebar";
import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useEffect } from "react";
import { api } from "../../../../convex/_generated/api";

export default function ManagerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { signOut } = useAuthActions();

    // Protection Logic:
    // 1. If Unauthenticated, Redirect to Login
    // 2. If Authenticated, Show Dashboard

    return (
        <>
            <Unauthenticated>
                <RedirectToLogin />
            </Unauthenticated>

            <Authenticated>
                <DashboardShell children={children} />
            </Authenticated>
        </>
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

