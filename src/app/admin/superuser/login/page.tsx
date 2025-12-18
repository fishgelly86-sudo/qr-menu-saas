"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Shield, AlertCircle } from "lucide-react";

export default function SuperAdminLoginPage() {
    const router = useRouter();
    const [secretKey, setSecretKey] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // Validate secret key against environment variable
            const expectedKey = process.env.NEXT_PUBLIC_SUPER_ADMIN_SECRET;

            if (!expectedKey) {
                setError("Super Admin access is not configured");
                setLoading(false);
                return;
            }

            if (secretKey === expectedKey) {
                // Store in session storage (not localStorage for security)
                sessionStorage.setItem("superadmin_key", secretKey);
                router.push("/admin/superuser");
            } else {
                setError("Invalid secret key");
                setLoading(false);
            }
        } catch (err) {
            console.error(err);
            setError("Authentication failed");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
            <Card className="w-full max-w-md border-gray-700 bg-gray-800/50 backdrop-blur">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-red-900/30 rounded-full border-2 border-red-500">
                            <Shield className="w-8 h-8 text-red-400" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">Super Admin Access</CardTitle>
                    <p className="text-sm text-gray-400">
                        Enter the master secret key to continue
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder="Secret Key"
                                value={secretKey}
                                onChange={(e) => setSecretKey(e.target.value)}
                                required
                                className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500"
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/50 p-3 rounded border border-red-900">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-red-600 hover:bg-red-700 text-white"
                            disabled={loading}
                        >
                            {loading ? "Authenticating..." : "Access Dashboard"}
                        </Button>

                        <div className="mt-4 pt-4 border-t border-gray-700">
                            <p className="text-xs text-center text-gray-500">
                                ⚠️ Unauthorized access is prohibited
                            </p>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
