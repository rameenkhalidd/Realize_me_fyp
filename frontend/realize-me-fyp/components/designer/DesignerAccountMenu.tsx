'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

import { useAuth } from '@/components/auth/AuthProvider';
import { getAccountInitial, getHeaderDisplayName } from '@/lib/auth-user-utils';
import {
    buildDesignerAccountHrefFromContext,
    getAccountBackLabel,
    resolveAccountBackHref,
} from '@/lib/designer-account-return';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { INTERACTIVE_BUTTON_MOTION } from '@/lib/interactive-button-motion';

export default function DesignerAccountMenu() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, loading } = useAuth();

    if (!isFirebaseConfigured() || loading || !user) {
        return null;
    }

    const onAccountPage = pathname.startsWith('/designer/account');
    const initial = getAccountInitial(user);
    const displayName = getHeaderDisplayName(user);

    const href = onAccountPage
        ? resolveAccountBackHref(searchParams)
        : buildDesignerAccountHrefFromContext(pathname, searchParams);

    const actionLabel = onAccountPage ? getAccountBackLabel(href) : 'Account settings';

    return (
        <Link
            href={href}
            scroll={false}
            title={actionLabel}
            aria-label={actionLabel}
            className={`inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${INTERACTIVE_BUTTON_MOTION}`}
        >
            {onAccountPage ? (
                <ChevronLeft className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
            ) : null}
            <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-violet-500 to-cyan-500 text-xs font-bold text-white"
                aria-hidden
            >
                {initial}
            </span>
            {displayName ? (
                <span className="hidden max-w-[7rem] truncate text-sm font-medium text-gray-700 sm:inline sm:max-w-[9rem]">
                    {displayName}
                </span>
            ) : null}
        </Link>
    );
}
