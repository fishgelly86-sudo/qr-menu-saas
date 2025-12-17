"use client";
import AdminSidebar from "@/components/AdminSidebar";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
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

import { createContext, useContext } from "react";
import { Id } from "../../../../convex/_generated/dataModel";

// 1. Create Context
interface RestaurantContextType {
    restaurant: any;
    isLoading: boolean;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export function useRestaurant() {
    const context = useContext(RestaurantContext);
    if (!context) {
        throw new Error("useRestaurant must be used within a ManagerLayout");
    }
    return context;
}

// Inner component to safely use queries
function DashboardShell({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    // 2. Resolve Restaurant ID Strategy
    // Strategy A: Check for Impersonation Token
    const [impersonatedId, setImpersonatedId] = useState<Id<"restaurants"> | null>(null);

    useEffect(() => {
        const sessionStr = localStorage.getItem("admin_session");
        if (sessionStr) {
            try {
                const session = JSON.parse(sessionStr);
                if (session.restaurantId) {
                    setImpersonatedId(session.restaurantId);
                }
            } catch (e) {
                console.error("Invalid admin session", e);
            }
        }
    }, []);

    // Strategy B: Fetch "My Restaurant" (Fallback if no impersonation)
    const { isAuthenticated } = useConvexAuth();
    const myRestaurant = useQuery(api.restaurants.getMyRestaurant, isAuthenticated ? {} : "skip");

    // Strategy C: Fetch Impersonated Restaurant (if token exists)
    // We need a helper query for getting by ID. We can repurpose `getRestaurantByOwner` or just `checkSubscription`? 
    // Actually, `api.restaurants.getRestaurantBySlug` is available but we have ID.
    // Let's rely on a simple consistent query. Ideally `api.restaurants.getById(id)` but we don't have it explicitly exported perhaps?
    // Let's use `checkSubscription` to get basic info? No, we need full info.
    // Let's use `api.restaurants.getMyRestaurant` as base, but we really need a "getRestaurantById" for admin usage.
    // Wait, we can use `listAllRestaurants` and filter? No too heavy.
    // Let's use `getMenu` or similiar? No.
    // Let's add `getRestaurantById` to `convex/restaurants.ts` or `convex/superAdmin.ts`?
    // For now, let's assume `getMyRestaurant` is enough FOR OWNER. 
    // FOR SUPERADMIN, the `admin_session` contains `slug`. So we can use `getRestaurantBySlug`.

    const [targetSlug, setTargetSlug] = useState<string | null>(null);

    useEffect(() => {
        const sessionStr = localStorage.getItem("admin_session");
        if (sessionStr) {
            const session = JSON.parse(sessionStr);
            if (session.slug) setTargetSlug(session.slug);
        }
    }, []);

    // If targetSlug set (Impersonation), fetch that. Else fetch owned.
    // NOTE: This logic is slightly complex because `getMyRestaurant` requires AUTH. Impersonation might not have AUTH if we are just a superuser?
    // Actually superuser has AUTH.

    const impersonatedRestaurant = useQuery(api.restaurants.getRestaurantBySlug,
        targetSlug ? { slug: targetSlug } : "skip"
    );

    const activeRestaurant = targetSlug ? impersonatedRestaurant : myRestaurant;
    const isLoading = targetSlug ? impersonatedRestaurant === undefined : myRestaurant === undefined;

    useEffect(() => {
        if (activeRestaurant) {
            const isSuspended = activeRestaurant.subscriptionStatus === "suspended";
            const isExpired = activeRestaurant.subscriptionExpiresAt && Date.now() > activeRestaurant.subscriptionExpiresAt;

            if (isSuspended || isExpired) {
                router.push("/admin/subscription-expired");
            }
        }
    }, [activeRestaurant, router]);

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    // If we finished loading but have no restaurant, that's an error state (unless creating one)
    if (!activeRestaurant && !isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 font-sans text-center">
                <h2 className="text-xl font-bold text-gray-900 mb-2">No Restaurant Found</h2>
                <p className="text-gray-500 mb-4">You do not appear to have a restaurant associated with your account.</p>
                <button onClick={() => router.push("/")} className="text-indigo-600 hover:underline">Go Home</button>
            </div>
        )
    }

    return (
        <RestaurantContext.Provider value={{ restaurant: activeRestaurant, isLoading }}>
            <div className="flex min-h-screen bg-gray-50 relative">
                <AdminSidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
                        {children}
                    </main>
                </div>
            </div>
        </RestaurantContext.Provider>
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

