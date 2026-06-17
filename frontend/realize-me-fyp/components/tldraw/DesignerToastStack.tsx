'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import {
    DESIGNER_TOAST_BASE_CLASS,
    DESIGNER_TOAST_ERROR_CLASS,
    DESIGNER_TOAST_STACK_CLASS,
} from '@/lib/designer-toast';

type DesignerToastStackProps = {
    canvasToast: string | null;
    onDismissCanvasToast: () => void;
    importToast: string | null;
    onDismissImportToast: () => void;
    draftSaveToast: string | null;
    onRetryDraftSave: () => void;
    onDismissDraftSaveToast: () => void;
};

function ToastShell({
    children,
    variant = 'default',
    reduceMotion,
}: {
    children: ReactNode;
    variant?: 'default' | 'error';
    reduceMotion: boolean | null;
}) {
    return (
        <motion.div
            role="alert"
            className={`${DESIGNER_TOAST_BASE_CLASS} ${variant === 'error' ? DESIGNER_TOAST_ERROR_CLASS : ''}`}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.22 }}
        >
            {children}
        </motion.div>
    );
}

export default function DesignerToastStack({
    canvasToast,
    onDismissCanvasToast,
    importToast,
    onDismissImportToast,
    draftSaveToast,
    onRetryDraftSave,
    onDismissDraftSaveToast,
}: DesignerToastStackProps) {
    const reduceMotion = useReducedMotion();
    const hasAnyToast = Boolean(canvasToast || importToast || draftSaveToast);

    if (!hasAnyToast) {
        return null;
    }

    return (
        <div className={DESIGNER_TOAST_STACK_CLASS} aria-live="polite">
            <AnimatePresence>
                {canvasToast ? (
                    <ToastShell key="canvas" reduceMotion={reduceMotion}>
                        <div className="flex items-start justify-between gap-3">
                            <p className="leading-snug text-gray-700">{canvasToast}</p>
                            <button
                                type="button"
                                onClick={onDismissCanvasToast}
                                className="shrink-0 text-xs font-medium text-purple-600 transition-colors hover:text-purple-800"
                                aria-label="Dismiss notification"
                            >
                                Dismiss
                            </button>
                        </div>
                    </ToastShell>
                ) : null}
            </AnimatePresence>
            <AnimatePresence>
                {importToast ? (
                    <ToastShell key="import" reduceMotion={reduceMotion}>
                        <div className="flex items-start justify-between gap-3">
                            <p className="leading-snug text-gray-700">{importToast}</p>
                            <button
                                type="button"
                                onClick={onDismissImportToast}
                                className="shrink-0 text-xs font-medium text-purple-600 transition-colors hover:text-purple-800"
                                aria-label="Dismiss import notification"
                            >
                                Dismiss
                            </button>
                        </div>
                    </ToastShell>
                ) : null}
            </AnimatePresence>
            <AnimatePresence>
                {draftSaveToast ? (
                    <ToastShell key="draft" variant="error" reduceMotion={reduceMotion}>
                        <div className="flex items-start justify-between gap-3">
                            <p className="leading-snug text-red-800">{draftSaveToast}</p>
                            <div className="flex shrink-0 items-center gap-2">
                                <button
                                    type="button"
                                    onClick={onRetryDraftSave}
                                    className="text-xs font-semibold text-red-700 transition-colors hover:text-red-900"
                                >
                                    Retry save
                                </button>
                                <span className="text-red-300" aria-hidden>
                                    ·
                                </span>
                                <button
                                    type="button"
                                    onClick={onDismissDraftSaveToast}
                                    className="text-xs font-medium text-red-600 transition-colors hover:text-red-800"
                                    aria-label="Dismiss autosave warning"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </ToastShell>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
