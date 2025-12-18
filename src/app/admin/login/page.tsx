"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/Button";
import { Lock, Mail, Eye, EyeOff, Utensils, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminLoginPage() {
    const { signIn } = useAuthActions();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await signIn("password", { email, password, flow: "signIn" });

            // Store session as an object with loginTime for invalidation checks
            localStorage.setItem("admin_session", JSON.stringify({
                authenticated: true,
                loginTime: Date.now()
            }));

            // Redirect to the main manager dashboard
            router.push("/admin/manager");
        } catch (err: any) {
            console.error(err);
            setError("Invalid email or password. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-[#FAF9F6] font-[family-name:var(--font-geist-sans)]">
            {/* Minimalist Background Illustration Pattern */}
            <div
                className="absolute inset-0 z-0 opacity-40 pointer-events-none"
                style={{
                    backgroundImage: `url('/backgrounds/restaurant-bg.png')`,
                    backgroundSize: '400px',
                    backgroundRepeat: 'repeat',
                    filter: 'grayscale(0.2) brightness(1.05)'
                }}
            />

            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 z-0 bg-gradient-to-tr from-[#FAF9F6]/80 via-transparent to-[#FAF9F6]/80" />

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-md px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="flex flex-col items-center"
                >
                    {/* Page Heading */}
                    <div className="text-center mb-8">
                        <h2 className="text-[#1A3C34] font-serif text-sm uppercase tracking-[0.3em] font-medium opacity-60">
                            Restaurant Manager
                        </h2>
                    </div>

                    {/* Login Card */}
                    <div className="w-full bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-8 lg:p-12 shadow-[0_20px_50px_rgba(26,60,52,0.08)] border border-white/50">
                        <div className="flex flex-col items-center mb-10">
                            <div className="w-16 h-16 bg-[#1A3C34] rounded-24 flex items-center justify-center shadow-lg mb-6">
                                <Utensils className="w-8 h-8 text-[#C5A059]" />
                            </div>
                            <h1 className="text-2xl font-bold text-[#1A3C34] text-center">Welcome Back</h1>
                            <p className="text-[#1A3C34]/50 text-sm mt-2 text-center">Sign in to manage your kitchen</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2">
                                <div className="relative group">
                                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C5A059]/60 group-focus-within:text-[#C5A059] transition-colors" />
                                    <input
                                        type="email"
                                        placeholder="Username or Email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full bg-black/5 border border-transparent focus:border-[#C5A059]/30 focus:bg-white rounded-full py-4 pl-14 pr-6 text-[#1A3C34] placeholder-[#1A3C34]/30 transition-all outline-none text-sm font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="relative group">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C5A059]/60 group-focus-within:text-[#C5A059] transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full bg-black/5 border border-transparent focus:border-[#C5A059]/30 focus:bg-white rounded-full py-4 pl-14 pr-14 text-[#1A3C34] placeholder-[#1A3C34]/30 transition-all outline-none text-sm font-medium"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 text-[#1A3C34]/20 hover:text-[#C5A059] transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <AnimatePresence mode="wait">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="flex items-center gap-2 bg-red-50 border border-red-100 p-4 rounded-2xl text-red-600 text-[12px] font-semibold"
                                    >
                                        <Info className="w-4 h-4 flex-shrink-0" />
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#1A3C34] hover:bg-[#122A25] text-[#C5A059] py-5 rounded-full font-bold tracking-[0.2em] text-xs uppercase shadow-[0_10px_30px_rgba(26,60,52,0.2)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-[#C5A059]/30 border-t-[#C5A059] rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>Sign In</span>
                                        <div className="w-1.5 h-1.5 bg-[#C5A059] rounded-full" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="mt-12 text-center">
                        <p className="text-[#1A3C34]/20 text-[10px] font-bold uppercase tracking-[0.4em]">
                            Professional Kitchen Suite
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
