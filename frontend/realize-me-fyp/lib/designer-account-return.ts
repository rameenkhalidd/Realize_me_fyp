const DEFAULT_BACK_HREF = '/designer';

type SearchParamsLike = Pick<URLSearchParams, 'get'>;

export function buildDesignerAccountHref(returnTo: string): string {
    const validated = validateDesignerReturnTo(returnTo);
    if (!validated) {
        return '/designer/account';
    }
    return `/designer/account?returnTo=${encodeURIComponent(validated)}`;
}

export function validateDesignerReturnTo(path: string | null | undefined): string | null {
    if (!path?.trim()) {
        return null;
    }

    const trimmed = path.trim();

    if (!trimmed.startsWith('/designer/')) {
        return null;
    }

    if (trimmed.startsWith('//') || trimmed.includes('://')) {
        return null;
    }

    if (trimmed.startsWith('/designer/account')) {
        return null;
    }

    return trimmed;
}

export function resolveAccountBackHref(searchParams: SearchParamsLike): string {
    return validateDesignerReturnTo(searchParams.get('returnTo')) ?? DEFAULT_BACK_HREF;
}

export function getAccountBackLabel(returnHref: string): string {
    const path = returnHref.split('?')[0] ?? returnHref;

    if (path.startsWith('/designer/results')) {
        return 'Back to Results';
    }
    if (path.startsWith('/designer/templates')) {
        return 'Back to Templates';
    }
    if (path.startsWith('/designer/history')) {
        return 'Back to My work';
    }

    return 'Back to Canvas';
}

/** Current designer location to store as returnTo when opening account settings. */
export function getDesignerReturnPath(pathname: string, searchParams: SearchParamsLike): string {
    const search = searchParams.toString();
    return search ? `${pathname}?${search}` : pathname;
}

/** Account link from header/rail — preserves returnTo when already on account. */
export function buildDesignerAccountHrefFromContext(
    pathname: string,
    searchParams: SearchParamsLike
): string {
    if (pathname.startsWith('/designer/account')) {
        const existing = validateDesignerReturnTo(searchParams.get('returnTo'));
        if (existing) {
            return `/designer/account?returnTo=${encodeURIComponent(existing)}`;
        }
        return '/designer/account';
    }

    return buildDesignerAccountHref(getDesignerReturnPath(pathname, searchParams));
}
