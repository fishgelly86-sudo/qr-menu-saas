"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SignupPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to login - signup is disabled for security
        router.push("/login");
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="w-full max-w-md">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8 text-center">
                    <div className="mb-6">
                        <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-3">
                            Registration Closed
                        </h1>
                        <p className="text-gray-300">
                            Public signup is disabled for security. Please contact your administrator to receive login credentials.
                        </p>
                    </div>
                    <button
                        onClick={() => router.push("/login")}
                        className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
}
