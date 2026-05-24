/**
 * Build `/login?next=...` for returning to the current designer route after sign-in.
 */
export function getDesignerLoginHref(pathname: string, searchParams: URLSearchParams): string {
    const search = searchParams.toString();
    const path = search ? `${pathname}?${search}` : pathname;
    return `/login?next=${encodeURIComponent(path)}`;
}
