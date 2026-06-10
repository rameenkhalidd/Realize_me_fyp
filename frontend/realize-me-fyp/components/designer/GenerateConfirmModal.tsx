'use client';

import { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

import { INTERACTIVE_BUTTON_MOTION } from '@/lib/interactive-button-motion';

type GenerateConfirmModalProps = {
    open: boolean;
    previewUrl: string | null;
    showDefaultColorNote: boolean;
    onBack: () => void;
    onContinue: () => void;
};

const FOCUSABLE =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function GenerateConfirmModal({
    open,
    previewUrl,
    showDefaultColorNote,
    onBack,
    onContinue,
}: GenerateConfirmModalProps) {
    const reduceMotion = useReducedMotion();
    const titleId = useId();
    const descriptionId = useId();
    const noteId = useId();
    const backRef = useRef<HTMLButtonElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);

    const close = useCallback(() => {
        onBack();
    }, [onBack]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                close();
                return;
            }

            if (event.key !== 'Tab' || !dialogRef.current) {
                return;
            }

            const focusable = Array.from(
                dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
            ).filter((el) => el.offsetParent !== null);

            if (focusable.length === 0) {
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        const focusTimer = window.setTimeout(() => backRef.current?.focus(), 0);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
            window.clearTimeout(focusTimer);
        };
    }, [open, close]);

    const instant = reduceMotion ? { duration: 0 } : undefined;

    const describedBy = showDefaultColorNote
        ? `${descriptionId} ${noteId}`
        : descriptionId;

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-12000 flex items-center justify-center bg-[#0F1115]/55 px-4 py-6 backdrop-blur-sm"
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={instant ?? { duration: 0.22 }}
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            close();
                        }
                    }}
                >
                    <motion.div
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        aria-describedby={describedBy}
                        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/35 bg-white/80 p-6 shadow-[0_40px_120px_-30px_rgba(15,17,21,0.5)] backdrop-blur-xl"
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

                        <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 ring-1 ring-violet-200/80">
                                <Sparkles size={22} aria-hidden />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 id={titleId} className="font-raleway text-2xl font-bold text-gray-900">
                                    Ready to generate?
                                </h2>
                                <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-gray-600">
                                    Here&apos;s how your sketch will be used for your design. You can go back and
                                    keep editing, or continue.
                                </p>
                                {showDefaultColorNote ? (
                                    <p id={noteId} className="mt-2 text-xs text-gray-500">
                                        We&apos;ll apply a default color.
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-3 shadow-sm">
                            <div className="aspect-square w-full max-w-[280px] mx-auto overflow-hidden rounded-xl border border-gray-100 bg-white">
                                {previewUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={previewUrl}
                                        alt="Preview of your sketch for generation"
                                        className="h-full w-full object-contain"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                                        Loading preview…
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <button
                                ref={backRef}
                                type="button"
                                onClick={onBack}
                                className={`rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 ${INTERACTIVE_BUTTON_MOTION}`}
                            >
                                Back to canvas
                            </button>
                            <button
                                type="button"
                                onClick={onContinue}
                                className={`rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-emerald-700 hover:shadow-lg active:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 ${INTERACTIVE_BUTTON_MOTION}`}
                            >
                                Generate
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
