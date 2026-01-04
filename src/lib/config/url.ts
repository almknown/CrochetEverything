/**
 * URL Configuration Utility
 * 
 * Handles dynamic URL resolution for:
 * - Local development (localhost:3000)
 * - Vercel preview deployments (*.vercel.app)
 * - Vercel production (project-name.vercel.app)
 * - Custom domains (your-domain.com)
 * 
 * Priority:
 * 1. CUSTOM_DOMAIN (if set) - for production with custom domain
 * 2. NEXT_PUBLIC_APP_URL (if set) - explicit override
 * 3. VERCEL_URL (auto-set by Vercel) - for preview/production
 * 4. localhost:3000 - fallback for local development
 */

function getBaseUrl(): string {
    // 1. Check for custom domain (production with own domain)
    if (process.env.CUSTOM_DOMAIN) {
        return `https://${process.env.CUSTOM_DOMAIN}`;
    }

    // 2. Check for explicit app URL override
    if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL;
    }

    // 3. Check for Vercel deployment URL
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }

    // 4. Fallback to localhost for development
    return 'http://localhost:3000';
}

/**
 * Get the absolute URL for a path
 * @param path - The path to append (e.g., '/api/webhook')
 * @returns The full absolute URL
 */
export function getAbsoluteUrl(path: string = ''): string {
    const baseUrl = getBaseUrl();
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
}

/**
 * Get the base URL for the application
 * @returns The base URL without trailing slash
 */
export function getAppUrl(): string {
    return getBaseUrl();
}

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
}

/**
 * Check if using a custom domain
 */
export function hasCustomDomain(): boolean {
    return !!process.env.CUSTOM_DOMAIN;
}

/**
 * Get Clerk auth URLs (useful for Clerk configuration)
 * These are configured to work with both Vercel subdomains and custom domains
 */
export function getAuthUrls() {
    const baseUrl = getBaseUrl();

    return {
        signInUrl: '/sign-in',
        signUpUrl: '/sign-up',
        signInFallbackRedirectUrl: '/dashboard',
        signUpFallbackRedirectUrl: '/dashboard',
        // For cross-domain redirects (if needed)
        afterSignInUrl: `${baseUrl}/dashboard`,
        afterSignUpUrl: `${baseUrl}/dashboard`,
    };
}
