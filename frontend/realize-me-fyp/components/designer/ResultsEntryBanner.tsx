'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';

type ResultsEntryBannerProps = {
    onDismiss: () => void;
};

const AUTO_DISMISS_MS = 9000;

export function ResultsEntryBanner({ onDismiss }: ResultsEntryBannerProps) {
    const reduceMotion = useReducedMotion();
    const onDismissRef = useRef(onDismiss);

    useEffect(() => {
        onDismissRef.current = onDismiss;
    }, [onDismiss]);

    useEffect(() => {
        const id = window.setTimeout(() => {
            onDismissRef.current();
        }, AUTO_DISMISS_MS);
        return () => window.clearTimeout(id);
    }, []);

    return (
        <motion.div
            role="status"
            aria-live="polite"
            initial={reduceMotion ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
            className="mb-8 rounded-2xl border border-emerald-200/90 bg-linear-to-r from-emerald-50/95 via-white to-cyan-50/90 px-4 py-4 shadow-sm sm:px-5 sm:py-4"
        >
            <div className="flex gap-3 sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-1 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="h-5 w-5" strokeWidth={2} aria-hidden />
                    </div>
                    <div className="min-w-0 pt-0.5">
                        <p className="font-raleway text-base font-semibold text-gray-900">You&apos;re all set</p>
                        <p className="mt-1 text-sm leading-relaxed text-gray-600">
                            Your sketch and rendered design are ready to compare below. Download what you need, explore
                            similar styles, or return to the canvas when you&apos;re ready for another pass.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => onDismissRef.current()}
                    className="shrink-0 rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/80 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                    aria-label="Dismiss notification"
                >
                    <X className="h-5 w-5" strokeWidth={2} />
                </button>
            </div>
        </motion.div>
    );
}
