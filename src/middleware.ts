import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory store for rate limiting
// Note: In serverless environments (Vercel), this map might be reset frequently.
// For production content, consider using Vercel KV or Upstash Redis.
const ipRequestCounts = new Map<string, { count: number; windowStart: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

export function middleware(request: NextRequest) {
    // Only apply to API routes
    if (request.nextUrl.pathname.startsWith('/api')) {
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const path = request.nextUrl.pathname;

        // Define limits based on path
        let limit = 20; // default
        if (path.includes('/auth') || path.includes('/login')) {
            limit = 5;
        } else if (path.includes('/orders')) {
            limit = 10;
        }

        const currentTime = Date.now();
        const requestLog = ipRequestCounts.get(ip) || { count: 0, windowStart: currentTime };

        // Reset window if passed
        if (currentTime - requestLog.windowStart > RATE_LIMIT_WINDOW) {
            requestLog.count = 0;
            requestLog.windowStart = currentTime;
        }

        requestLog.count++;
        ipRequestCounts.set(ip, requestLog);

        if (requestLog.count > limit) {
            return new NextResponse(
                JSON.stringify({ error: 'Too many requests', retryAfter: RATE_LIMIT_WINDOW / 1000 }),
                { status: 429, headers: { 'Content-Type': 'application/json' } }
            );
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/api/:path*',
};
