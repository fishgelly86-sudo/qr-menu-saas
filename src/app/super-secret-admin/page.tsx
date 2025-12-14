"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";

export default function SuperAdminClaimPage() {
    const [secret, setSecret] = useState("");
    const [status, setStatus] = useState("");
    const router = useRouter();

    const claimSuperAdmin = useMutation(api.security.claimSuperAdmin);
    const user = useQuery(api.auth.loggedInUser);

    const handleClaim = async () => {
        try {
            setStatus("Claiming...");
            const result = await claimSuperAdmin({ secret });
            setStatus(result.message);
            if (result.message.includes("successfully") || result.message.includes("Already")) {
                setTimeout(() => router.push("/admin/super"), 1000);
            }
        } catch (error: any) {
            setStatus("Error: " + error.message);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <p>Please log in first before accessing this page.</p>
                <button
                    onClick={() => router.push("/login")}
                    className="ml-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                >
                    Login
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white p-4">
            <div className="max-w-md w-full bg-gray-900 p-8 rounded-xl border border-gray-800 shadow-2xl">
                <h1 className="text-2xl font-bold mb-6 text-red-500 flex items-center gap-2">
                    🛡️ Super Admin Access
                </h1>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Secret Key
                        </label>
                        <input
                            type="password"
                            value={secret}
                            onChange={(e) => setSecret(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-white"
                            placeholder="Enter the secret key..."
                        />
                    </div>

                    <button
                        onClick={handleClaim}
                        className="w-full py-3 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold rounded-lg transition-all transform active:scale-95"
                    >
                        Claim Access
                    </button>

                    {status && (
                        <div className={`p-3 rounded-lg text-sm text-center ${status.includes("Error") ? "bg-red-900/50 text-red-200" : "bg-green-900/50 text-green-200"
                            }`}>
                            {status}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
