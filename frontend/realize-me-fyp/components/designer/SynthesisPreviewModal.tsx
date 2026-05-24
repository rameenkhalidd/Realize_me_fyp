'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';

type SynthesisPreviewModalProps = {
    open: boolean;
    isGenerating: boolean;
    elapsedSeconds: number;
    stepLabel: string;
    isDemoMode: boolean;
    errorMessage: string | null;
    /** When true, error copy uses destructive (red) styling — e.g. storage quota. */
    errorIsDestructive?: boolean;
    onRetry: () => void;
    onCloseError: () => void;
};

function formatElapsed(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function SynthesisPreviewModal({
    open,
    isGenerating,
    elapsedSeconds,
    stepLabel,
    isDemoMode,
    errorMessage,
    errorIsDestructive = false,
    onRetry,
    onCloseError,
}: SynthesisPreviewModalProps) {
    const reduceMotion = useReducedMotion();
    const instant = reduceMotion ? { duration: 0 } : undefined;

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-12000 flex items-center justify-center bg-[#0F1115]/55 px-4 py-6 backdrop-blur-sm"
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={instant ?? { duration: 0.22 }}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="synthesis-preview-title"
                    aria-describedby="synthesis-preview-description"
                >
                    <motion.div
                        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/35 bg-white/70 p-6 shadow-[0_40px_120px_-30px_rgba(15,17,21,0.5)] backdrop-blur-xl"
                        initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.99 }}
                        transition={instant ?? { type: 'spring', stiffness: 360, damping: 34 }}
                    >
                        <div className="pointer-events-none absolute inset-0 -z-10">
                            <div className="absolute -left-8 -top-10 h-44 w-44 rounded-full bg-[#8B5CF6]/30 blur-3xl" />
                            <div className="absolute -right-4 top-1/3 h-44 w-44 rounded-full bg-[#06B6D4]/25 blur-3xl" />
                            <div className="absolute bottom-0 left-1/3 h-36 w-36 rounded-full bg-[#D946EF]/20 blur-3xl" />
                        </div>

                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 id="synthesis-preview-title" className="font-raleway text-2xl font-bold text-gray-900">
                                    Creating your look
                                </h2>
                                <p id="synthesis-preview-description" className="mt-1 text-sm text-gray-600">
                                    {isGenerating
                                        ? 'We’re turning your sketch into a finished render. This usually takes a moment.'
                                        : 'We couldn’t finish this render.'}
                                </p>
                            </div>
                            {isDemoMode && (
                                <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800">
                                    Preview
                                </span>
                            )}
                        </div>

                        <div className="mt-5 rounded-2xl border border-white/60 bg-white/65 p-4 shadow-sm">
                            <div className="mb-3 flex items-center justify-between text-xs font-medium text-gray-600">
                                <span>Elapsed time</span>
                                <span className="font-mono text-sm text-gray-900">{formatElapsed(elapsedSeconds)}</span>
                            </div>

                            <div className="relative h-40 overflow-hidden rounded-xl border border-gray-200/80 bg-white">
                                <div className="absolute inset-0 bg-linear-to-r from-[#8B5CF6]/15 via-[#D946EF]/15 to-[#06B6D4]/15" />
                                <motion.div
                                    className="absolute inset-y-0 -left-1/2 w-1/2 bg-linear-to-r from-transparent via-white/70 to-transparent"
                                    animate={
                                        reduceMotion
                                            ? { x: '0%' }
                                            : {
                                                x: ['0%', '220%'],
                                                transition: {
                                                    repeat: Infinity,
                                                    duration: 2.4,
                                                    ease: 'linear',
                                                },
                                            }
                                    }
                                />
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="h-7 w-7 animate-spin text-purple-600" />
                                            <p className="text-sm font-medium text-gray-700">{stepLabel}</p>
                                            <p className="text-xs text-gray-500">
                                                Please keep this window open until we finish.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <AlertTriangle className="h-7 w-7 text-amber-500" />
                                            <p className="text-sm font-medium text-gray-800">Something went wrong</p>
                                            <p
                                                className={
                                                    errorIsDestructive
                                                        ? 'text-xs font-medium text-red-600'
                                                        : 'text-xs text-gray-600'
                                                }
                                            >
                                                {errorMessage ?? 'Please try again in a moment.'}
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {isGenerating ? (
                            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                                <Sparkles className="h-4 w-4 text-purple-500" />
                                Refining your render…
                            </div>
                        ) : (
                            <div className="mt-5 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onCloseError}
                                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                                >
                                    Return to canvas
                                </button>
                                <button
                                    type="button"
                                    onClick={onRetry}
                                    className="rounded-xl bg-linear-to-r from-[#8B5CF6] via-[#D946EF] to-[#06B6D4] px-4 py-2 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-95"
                                >
                                    Try again
                                </button>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
