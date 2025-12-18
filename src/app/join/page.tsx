"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";

// Internal component that uses useSearchParams
function JoinContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { signIn } = useAuthActions();

    const token = searchParams?.get("token") || "";

    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [inviteData, setInviteData] = useState<any>(null);

    const acceptInvite = useMutation(api.staff.acceptInvite);
    const completeRegistration = useMutation(api.staff.completeStaffRegistration);

    // Validate token on load
    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                setError("Invalid invite link");
                return;
            }

            try {
                const data = await acceptInvite({ token, name: "", password: "" });
                setInviteData(data);
            } catch (err: any) {
                setError(err.message);
            }
        };

        validateToken();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (!inviteData) {
            setError("Invalid invite");
            return;
        }

        setLoading(true);

        try {
            // 1. Create auth account via Convex Auth
            await signIn("password", {
                email: inviteData.email,
                password,
                flow: "signUp",
            });

            // 2. Complete staff registration
            await completeRegistration({
                token,
                name,
            });

            // 3. Redirect to admin
            router.push("/admin");
        } catch (err: any) {
            setError(err.message || "Failed to create account");
            setLoading(false);
        }
    };

    if (error && !inviteData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">Invalid Invite</h1>
                    <p className="text-gray-300 mb-6">{error}</p>
                    <button
                        onClick={() => router.push("/admin/login")}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="w-full max-w-md">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">
                            Join the Team
                        </h1>
                        <p className="text-gray-300">
                            Create your account to get started
                        </p>
                        {inviteData && (
                            <p className="text-sm text-purple-300 mt-2">
                                Role: <span className="font-semibold">{inviteData.role}</span>
                            </p>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-2">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={inviteData?.email || ""}
                                disabled
                                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-gray-400"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-2">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold rounded-lg shadow-lg transition"
                        >
                            {loading ? "Creating Account..." : "Join Team"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

// Main page component with Suspense boundary
export default function JoinPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <div className="text-white text-lg">Loading...</div>
            </div>
        }>
            <JoinContent />
        </Suspense>
    );
}
