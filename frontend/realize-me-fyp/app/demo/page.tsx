'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';

import GuestDemoCanvas from '@/components/demo/GuestDemoCanvas';
import CanvasGuidePanel from '@/components/designer/CanvasGuidePanel';
import { BrandLogo } from '@/components/BrandLogo';
import { INTERACTIVE_BUTTON_MOTION } from '@/lib/interactive-button-motion';
import { useAuth } from '@/components/auth/AuthProvider';
import { hasClientAuthSession, isAuthRequired } from '@/lib/auth-flags';
import { isFirebaseConfigured } from '@/lib/firebase/config';

export default function DemoPage() {
    const reduceMotion = useReducedMotion();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        if (isFirebaseConfigured()) {
            if (!authLoading && user) {
                router.replace('/designer');
            }
            return;
        }

        if (isAuthRequired() && hasClientAuthSession()) {
            router.replace('/designer');
        }
    }, [router, authLoading, user]);

    if ((isFirebaseConfigured() && authLoading) || (isFirebaseConfigured() && user)) {
        return (
            <div className="flex h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 font-roboto">
                <p className="text-sm text-gray-600">Opening workspace…</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-purple-50 via-white to-blue-50 font-roboto md:flex-row">
            <main className="flex min-h-0 min-w-0 flex-1 flex-col">
                <motion.header
                    initial={reduceMotion ? false : { opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                        reduceMotion
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 320, damping: 32 }
                    }
                    className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white/80 px-4 py-4 backdrop-blur-md sm:px-6"
                >
                    <BrandLogo theme="light" subtitle="Try the canvas" />
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Link
                            href="/login?next=%2Fdesigner"
                            className={`hidden text-sm font-medium text-violet-700 hover:text-violet-900 sm:inline ${INTERACTIVE_BUTTON_MOTION}`}
                        >
                            Sign in
                        </Link>
                        <Link
                            href="/"
                            className={`text-sm font-medium text-gray-600 transition hover:text-gray-900 ${INTERACTIVE_BUTTON_MOTION}`}
                        >
                            ← Home
                        </Link>
                    </div>
                </motion.header>

                <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:flex-row sm:gap-6 sm:p-6">
                    <div className="min-h-[50vh] min-w-0 flex-[3] sm:min-h-0">
                        <div className="h-full min-h-[320px] overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-xl sm:min-h-0">
                            <GuestDemoCanvas />
                        </div>
                    </div>
                    <div className="min-h-0 w-full min-w-0 flex-[1] sm:max-w-md">
                        <CanvasGuidePanel variant="guest" />
                    </div>
                </div>
            </main>
        </div>
    );
}
