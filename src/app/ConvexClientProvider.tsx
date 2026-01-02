"use client";

import { ReactNode } from "react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { getConvexUrl } from "@/lib/convex";

const convex = new ConvexReactClient(getConvexUrl());

export default function ConvexClientProvider({
    children,
}: {
    children: ReactNode;
}) {
    return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>;
}
