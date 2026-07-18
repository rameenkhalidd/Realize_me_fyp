'use client';

import { usePathname } from 'next/navigation';

export function getDesignerPageTitle(pathname: string): string {
    if (pathname.startsWith('/designer/results')) {
        return 'Results';
    }
    const detailMatch = pathname.match(/^\/designer\/history\/([^/]+)$/);
    if (detailMatch?.[1]) {
        return `Generation #${detailMatch[1]}`;
    }
    if (pathname.startsWith('/designer/history')) {
        return 'My work';
    }
    if (pathname.startsWith('/designer/templates')) {
        return 'Templates';
    }
    if (pathname.startsWith('/designer/account')) {
        return 'Account';
    }
    if (pathname === '/designer') {
        return 'Canvas';
    }
    return 'Canvas';
}

export default function DesignerPageHeading() {
    const pathname = usePathname();
    const title = getDesignerPageTitle(pathname);

    return (
        <p className="mt-0.5 text-sm font-semibold text-violet-700" aria-current="page">
            {title}
        </p>
    );
}
