'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';

import { BrandLogo } from '@/components/BrandLogo';
import DesignerHeaderDraft from '@/components/designer/DesignerHeaderDraft';
import DesignerPageHeading from '@/components/designer/DesignerPageHeading';
import DesignerRail from '@/components/designer/DesignerRail';
import DesignerAccountMenu from '@/components/designer/DesignerAccountMenu';
import DesignerReturnToCanvasButton from '@/components/designer/DesignerReturnToCanvasButton';
import { SignOutConfirmProvider } from '@/components/designer/SignOutConfirmContext';
import { useAuth } from '@/components/auth/AuthProvider';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { hasClientAuthSession, isAuthRequired, shouldSkipDesignerAuthInDevelopment } from '@/lib/auth-flags';
import { getDesignerLoginHref } from '@/lib/designer-auth-redirect';
import {
    readDesignerRailExpanded,
    writeDesignerRailExpanded,
} from '@/lib/designer-rail-preference';

export default function DesignerShell({ children }: { children: ReactNode }) {
    const [isRailExpanded, setIsRailExpanded] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const reduceMotion = useReducedMotion();
    const { user, loading: authLoading } = useAuth();

    const isResultsPage = pathname.startsWith('/designer/results');
    const transitionClass = reduceMotion ? '' : 'transition-all duration-200 ease-in-out';
    const railWidthClass = isRailExpanded ? 'w-32' : 'w-14';

    useEffect(() => {
        setIsRailExpanded(readDesignerRailExpanded());
    }, []);

    useEffect(() => {
        if (shouldSkipDesignerAuthInDevelopment()) {
            return;
        }
        if (isFirebaseConfigured()) {
            if (!authLoading && !user) {
                router.replace(getDesignerLoginHref(pathname, searchParams));
            }
            return;
        }
        if (isAuthRequired() && !hasClientAuthSession()) {
            router.replace('/login?next=' + encodeURIComponent(pathname));
        }
    }, [router, pathname, searchParams, authLoading, user]);

    const toggleRailExpanded = useCallback(() => {
        setIsRailExpanded((prev) => {
            const next = !prev;
            writeDesignerRailExpanded(next);
            return next;
        });
    }, []);

    const collapseRail = useCallback(() => {
        setIsRailExpanded(false);
        writeDesignerRailExpanded(false);
    }, []);

    return (
        <SignOutConfirmProvider>
        <div className="flex h-screen overflow-hidden bg-linear-to-br from-purple-50 via-white to-blue-50 font-roboto">
            {isRailExpanded ? (
                <button
                    type="button"
                    className="fixed inset-0 z-20 bg-black/40 md:hidden"
                    aria-label="Collapse sidebar"
                    onClick={collapseRail}
                />
            ) : null}

            <aside
                className={`
                    fixed inset-y-0 left-0 top-0 z-30 flex flex-col border-r border-gray-800 bg-[#0F1115]
                    ${transitionClass}
                    md:relative md:top-auto md:bottom-auto
                    overflow-hidden translate-x-0
                    ${railWidthClass}
                `}
            >
                <DesignerRail
                    expanded={isRailExpanded}
                    onToggleExpanded={toggleRailExpanded}
                    reduceMotion={reduceMotion}
                />
            </aside>

            <main className="ml-14 flex min-w-0 flex-1 flex-col md:ml-0">
                <motion.header
                    initial={reduceMotion ? false : { opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                        reduceMotion
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 320, damping: 32 }
                    }
                    className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-3.5"
                >
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="min-w-0">
                            <BrandLogo theme="light" />
                            <DesignerPageHeading />
                        </div>
                    </div>

                    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-4">
                        {isResultsPage ? <DesignerReturnToCanvasButton /> : null}
                        <DesignerHeaderDraft />
                        <DesignerAccountMenu />
                    </div>
                </motion.header>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
            </main>
        </div>
        </SignOutConfirmProvider>
    );
}
