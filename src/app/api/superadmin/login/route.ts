import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';
import { getConvexUrl } from "@/lib/convex";



export async function POST(request: NextRequest) {
    try {
        const { secretKey } = await request.json();

        if (!secretKey) {
            return NextResponse.json(
                { success: false, error: 'Secret key is required' },
                { status: 400 }
            );
        }

        // Call the Convex backend to validate the secret
        try {
            const convex = new ConvexHttpClient(getConvexUrl());
            const result = await convex.query(api.superAdminAuth.validateSuperAdminKey, {
                secretKey,
            });

            if (result.success) {
                return NextResponse.json({ success: true });
            } else {
                return NextResponse.json(
                    { success: false, error: 'Invalid secret key' },
                    { status: 401 }
                );
            }
        } catch (error: any) {
            // Check if it's the "not configured" error
            if (error.message && error.message.includes('not configured')) {
                return NextResponse.json(
                    { success: false, error: 'Super Admin access is not configured' },
                    { status: 500 }
                );
            }

            // Check if it's an invalid key error
            if (error.message && error.message.includes('Invalid')) {
                return NextResponse.json(
                    { success: false, error: 'Invalid secret key' },
                    { status: 401 }
                );
            }

            // Generic error
            return NextResponse.json(
                { success: false, error: error.message || 'Authentication failed' },
                { status: 500 }
            );
        }
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: 'Invalid request' },
            { status: 400 }
        );
    }
}

