"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SubscriptionExpiredPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-red-900 to-slate-900">
            <div className="max-w-md text-center">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>

                    <h1 className="text-3xl font-bold text-white mb-4">
                        Subscription Expired
                    </h1>

                    <p className="text-gray-300 mb-8">
                        Your restaurant's subscription has expired or been suspended. Please contact support to reactivate your account.
                    </p>

                    <button
                        onClick={() => router.push("/admin/login")}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg shadow-lg transition"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
}
