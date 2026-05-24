export const AUTH_REQUIRED_FLAG = process.env.NEXT_PUBLIC_REQUIRE_AUTH === 'true';

/** Dev-only: skip Firebase login redirect on /designer and /designer/results (never set in production). */
export function shouldSkipDesignerAuthInDevelopment(): boolean {
    return (
        process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === 'true'
    );
}

export function isAuthRequired() {
    return AUTH_REQUIRED_FLAG;
}

export function hasClientAuthSession() {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('realizeme:isAuthenticated') === 'true';
}
