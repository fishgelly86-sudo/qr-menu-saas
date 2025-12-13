/**
 * Validates a QR code URL to ensure it points to a trusted domain and uses HTTPS.
 * @param url The URL to validate
 * @returns boolean
 */
export function validateQRCodeUrl(url: string): boolean {
    try {
        const parsed = new URL(url);

        // Ensure protocol is HTTPS
        if (parsed.protocol !== 'https:') {
            if (process.env.NODE_ENV === 'development' && parsed.protocol === 'http:') {
                // Allow HTTP in dev
            } else {
                return false;
            }
        }

        // Whitelist domains (adjust as needed)
        const allowedDomains = [
            'localhost',
            'qr-menu-saas.vercel.app',
            'my-qr-app.com' // Example custom domain
        ];

        // Check if hostname ends with any allowed domain (to allow subdomains)
        const isAllowed = allowedDomains.some(domain =>
            parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
        );

        return isAllowed;
    } catch (e) {
        return false;
    }
}

/**
 * Removes dangerous characters from a URL string.
 * @param url The raw URL string
 * @returns string Sanitized URL
 */
export function sanitizeUrl(url: string): string {
    // Basic sanitization: remove javascript: pseudo-protocol and control characters
    if (!url) return "";
    return url.replace(/javascript:/gi, "").replace(/[^\w\d\-._~:/?#\[\]@!$&'()*+,;=]/g, "");
}
