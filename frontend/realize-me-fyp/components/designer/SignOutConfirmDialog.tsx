'use client';

import { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import type { SignOutDraftSnapshot } from '@/lib/sign-out-confirm-copy';
import {
    getSignOutConfirmSubtitleText,
    isSignOutBlockedBySave,
    SignOutConfirmSubtitle,
} from '@/lib/sign-out-confirm-copy';
import { INTERACTIVE_BUTTON_MOTION } from '@/lib/interactive-button-motion';

type SignOutConfirmDialogProps = {
    open: boolean;
    signingOut: boolean;
    pathname: string;
    draft: SignOutDraftSnapshot;
    onCancel: () => void;
    onConfirm: () => void;
};

const FOCUSABLE =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: 0.28, ease: EASE_OUT },
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.2, ease: EASE_IN },
    },
};

const dialogVariants = {
    hidden: { opacity: 0, scale: 0.96, y: 10 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.32, ease: EASE_OUT, delay: 0.04 },
    },
    exit: {
        opacity: 0,
        scale: 0.98,
        y: 6,
        transition: { duration: 0.18, ease: EASE_IN },
    },
};

export default function SignOutConfirmDialog({
    open,
    signingOut,
    pathname,
    draft,
    onCancel,
    onConfirm,
}: SignOutConfirmDialogProps) {
    const reduceMotion = useReducedMotion();
    const titleId = useId();
    const descriptionId = useId();
    const cancelRef = useRef<HTMLButtonElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);

    const saveInProgress = isSignOutBlockedBySave(draft);
    const subtitleText = getSignOutConfirmSubtitleText(draft, pathname);

    const close = useCallback(() => {
        if (signingOut) {
            return;
        }
        onCancel();
    }, [onCancel, signingOut]);

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
        const focusTimer = window.setTimeout(() => cancelRef.current?.focus(), 0);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
            window.clearTimeout(focusTimer);
        };
    }, [open, close]);

    const overlayMotion = reduceMotion
        ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0 } }
        : { variants: overlayVariants, initial: 'hidden' as const, animate: 'visible' as const, exit: 'exit' as const };

    const dialogMotion = reduceMotion
        ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0 } }
        : { variants: dialogVariants, initial: 'hidden' as const, animate: 'visible' as const, exit: 'exit' as const };

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <AnimatePresence>
            {open ? (
                <motion.div
                    className="fixed inset-0 z-12000 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm"
                    {...overlayMotion}
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
                        aria-describedby={descriptionId}
                        className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
                        {...dialogMotion}
                    >
                        <h2 id={titleId} className="font-raleway text-lg font-bold text-gray-900">
                            Sign out of RealizeMe?
                        </h2>
                        <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-gray-600">
                            <SignOutConfirmSubtitle draft={draft} pathname={pathname} />
                        </p>
                        <span className="sr-only">{subtitleText}</span>

                        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                ref={cancelRef}
                                type="button"
                                onClick={close}
                                disabled={signingOut}
                                className={`rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 ${INTERACTIVE_BUTTON_MOTION}`}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                disabled={signingOut || saveInProgress}
                                className={`rounded-xl border border-violet-200/90 bg-violet-50/70 px-4 py-2.5 text-sm font-semibold text-violet-900 shadow-sm transition-colors hover:border-violet-300 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 ${INTERACTIVE_BUTTON_MOTION}`}
                            >
                                {signingOut ? 'Signing out…' : 'Sign out'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>,
        document.body
    );
}
