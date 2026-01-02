export function getConvexUrl(): string {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) {
        throw new Error(
            "NEXT_PUBLIC_CONVEX_URL is undefined. Make sure it is set in your environment variables."
        );
    }
    return url;
}
