'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Menu } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

import { BrandLogo } from '@/components/BrandLogo';
import DesignerHeaderDraft from '@/components/designer/DesignerHeaderDraft';
import DesignerPageHeading from '@/components/designer/DesignerPageHeading';
import DesignerRail from '@/components/designer/DesignerRail';
import DesignerReturnToCanvasButton from '@/components/designer/DesignerReturnToCanvasButton';
import { useAuth } from '@/components/auth/AuthProvider';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { hasClientAuthSession, isAuthRequired, shouldSkipDesignerAuthInDevelopment } from '@/lib/auth-flags';
import { getDesignerLoginHref } from '@/lib/designer-auth-redirect';
import { INTERACTIVE_BUTTON_MOTION } from '@/lib/interactive-button-motion';

export default function DesignerShell({ children }: { children: ReactNode }) {
    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const reduceMotion = useReducedMotion();
    const { user, loading: authLoading } = useAuth();

    const accountLabel = user?.email ?? user?.displayName ?? null;
    const isResultsPage = pathname.startsWith('/designer/results');

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

    return (
        <div className="flex h-screen overflow-hidden bg-linear-to-br from-purple-50 via-white to-blue-50 font-roboto">
            <aside
                className={`
                    fixed inset-y-0 left-0 top-0 z-30 flex flex-col border-r border-gray-800 bg-[#0F1115]
                    transition-all duration-300 ease-in-out
                    md:relative md:top-auto md:bottom-auto
                    overflow-hidden
                    ${isLeftSidebarOpen ? 'translate-x-0 w-14' : '-translate-x-full md:w-0 md:border-none'}
                `}
            >
                <DesignerRail onCloseSidebar={() => setIsLeftSidebarOpen(false)} />
            </aside>

            <main className="flex min-w-0 flex-1 flex-col">
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
                        {!isLeftSidebarOpen ? (
                            <button
                                type="button"
                                onClick={() => setIsLeftSidebarOpen(true)}
                                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 ${INTERACTIVE_BUTTON_MOTION}`}
                                title="Open sidebar"
                                aria-label="Open sidebar"
                            >
                                <Menu className="h-5 w-5" aria-hidden />
                            </button>
                        ) : null}
                        <div className="min-w-0">
                            <BrandLogo theme="light" />
                            <DesignerPageHeading />
                        </div>
                    </div>

                    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-4">
                        {isResultsPage ? <DesignerReturnToCanvasButton /> : null}
                        <DesignerHeaderDraft />
                        {isFirebaseConfigured() && accountLabel ? (
                            <span
                                className="hidden max-w-[8rem] truncate text-xs text-gray-500 lg:inline xl:max-w-[12rem]"
                                title={accountLabel}
                            >
                                {accountLabel}
                            </span>
                        ) : null}
                    </div>
                </motion.header>

                <div className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</div>
            </main>
        </div>
    );
}
