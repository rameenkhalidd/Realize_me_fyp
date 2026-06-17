'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FilePlus2 } from 'lucide-react';
import { useEditor } from 'tldraw';

import { clearAllCanvasShapes } from '@/lib/tldraw-utils';

type ClearCanvasActionProps = {
    hasCanvasShapes: boolean;
    /** `menu` = top-left file strip; `icon` = compact toolbar icon (guest demo). */
    variant: 'menu' | 'icon';
    inactiveBtnClass?: string;
    disabledBtnClass?: string;
    showDraftHint?: boolean;
};

const FOCUSABLE =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function ClearCanvasAction({
    hasCanvasShapes,
    variant,
    inactiveBtnClass = '',
    disabledBtnClass = '',
    showDraftHint = false,
}: ClearCanvasActionProps) {
    const editor = useEditor();
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const reduceMotion = useReducedMotion();
    const titleId = useId();
    const descriptionId = useId();
    const draftHintId = useId();
    const tipId = useId();
    const keepRef = useRef<HTMLButtonElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const close = useCallback(() => {
        setOpen(false);
        requestAnimationFrame(() => triggerRef.current?.focus());
    }, []);

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
        const focusTimer = window.setTimeout(() => keepRef.current?.focus(), 0);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
            window.clearTimeout(focusTimer);
        };
    }, [open, close]);

    const handleConfirm = () => {
        if (!editor || !hasCanvasShapes) {
            close();
            return;
        }
        clearAllCanvasShapes(editor);
        editor.setCurrentTool('draw');
        close();
    };

    const instant = reduceMotion ? { duration: 0 } : undefined;

    const describedBy = [descriptionId, showDraftHint ? draftHintId : null, tipId]
        .filter(Boolean)
        .join(' ');

    const trigger =
        variant === 'menu' ? (
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen(true)}
                disabled={!hasCanvasShapes}
                className="min-w-[48px] h-10 px-1.5 rounded-md border border-gray-200 bg-white text-gray-700 shadow-sm transition-colors inline-flex flex-col items-center justify-center gap-0.5 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                title={hasCanvasShapes ? 'Start a new sketch' : 'Draw something first'}
                aria-label="Start a new sketch"
            >
                <FilePlus2 size={16} aria-hidden />
                <span className="text-[9px] font-medium leading-none">New</span>
            </button>
        ) : (
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen(true)}
                disabled={!hasCanvasShapes}
                className={`shrink-0 p-3 rounded-xl ${inactiveBtnClass} ${disabledBtnClass}`}
                title={hasCanvasShapes ? 'Start a new sketch' : 'Draw something first'}
                aria-label="Start a new sketch"
            >
                <FilePlus2 size={20} aria-hidden />
            </button>
        );

    const dialog =
        mounted &&
        createPortal(
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

                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 ring-1 ring-violet-200/80">
                                    <FilePlus2 size={24} aria-hidden />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2
                                        id={titleId}
                                        className="font-raleway text-2xl font-bold text-gray-900"
                                    >
                                        Start a new sketch?
                                    </h2>
                                    <p
                                        id={descriptionId}
                                        className="mt-2 text-sm leading-relaxed text-gray-600"
                                    >
                                        This clears your canvas and resets the view to{' '}
                                        <span className="font-semibold text-gray-800">100% zoom</span>{' '}
                                        so you can draw fresh.
                                    </p>
                                    {showDraftHint ? (
                                        <p id={draftHintId} className="mt-2 text-xs text-gray-500">
                                            Your draft will update automatically after you edit or leave
                                            the page.
                                        </p>
                                    ) : null}
                                    <p id={tipId} className="mt-2 text-xs text-gray-500">
                                        Tip: use Undo if you only meant to remove one stroke.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                                <button
                                    ref={keepRef}
                                    type="button"
                                    onClick={close}
                                    className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
                                >
                                    Keep sketch
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    className="rounded-xl bg-linear-to-r from-rose-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-rose-600 hover:to-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
                                >
                                    Clear &amp; start new
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>,
            document.body
        );

    return (
        <>
            {trigger}
            {dialog}
        </>
    );
}
