const DEFAULT_FALLBACK = '/designer';

/**
 * Validates the `next` query param for post-login redirects.
 * Allows same-origin relative paths only; blocks open redirects (e.g. //evil.com, \\, protocols).
 */
export function safeRelativeNextPath(
    next: string | null | undefined,
    fallback: string = DEFAULT_FALLBACK
): string {
    if (next == null || typeof next !== 'string') {
        return fallback;
    }

    const trimmed = next.trim();
    if (trimmed.length === 0 || trimmed.length > 2048) {
        return fallback;
    }

    if (!trimmed.startsWith('/')) {
        return fallback;
    }

    // Protocol-relative and odd URL shapes
    if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
        return fallback;
    }

    if (trimmed.includes('://') || trimmed.includes('\\')) {
        return fallback;
    }

    // Control / newline injection
    if (/[\u0000-\u001f\u007f]/.test(trimmed)) {
        return fallback;
    }

    return trimmed;
}
