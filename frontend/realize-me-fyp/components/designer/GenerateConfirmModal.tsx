'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronRight, Search, Sparkles } from 'lucide-react';

import type { ActiveTemplateGarment } from '@/lib/tldraw-utils';
import {
    filterGenerationCategories,
    getGenerationCategoryById,
    resolveGarmentLabelForCategoryId,
} from '@/lib/generation-categories';
import { INTERACTIVE_BUTTON_MOTION } from '@/lib/interactive-button-motion';

export type GenerateCategorySelection = {
    generationCategoryId: string;
    garmentLabel: string;
};

type GenerateConfirmModalProps = {
    open: boolean;
    previewUrl: string | null;
    showDefaultColorNote: boolean;
    detectedGarment: ActiveTemplateGarment | null;
    onBack: () => void;
    onContinue: (category: GenerateCategorySelection) => void;
};

type ModalStep = 'preview' | 'category';

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
        transition: { duration: 0.18, ease: EASE_IN },
    },
};

const dialogVariants = {
    hidden: { opacity: 0, scale: 0.96 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.32, ease: EASE_OUT, delay: 0.05 },
    },
    exit: {
        opacity: 0,
        scale: 0.98,
        transition: { duration: 0.16, ease: EASE_IN },
    },
};

const stepVariants = {
    enter: (direction: number) => ({
        opacity: 0,
        x: direction > 0 ? 24 : -24,
    }),
    center: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.24, ease: EASE_OUT },
    },
    exit: (direction: number) => ({
        opacity: 0,
        x: direction > 0 ? -24 : 24,
        transition: { duration: 0.18, ease: EASE_IN },
    }),
};

const emeraldButtonClass = `rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-emerald-700 hover:shadow-lg active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 ${INTERACTIVE_BUTTON_MOTION}`;

const outlineButtonClass = `rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 ${INTERACTIVE_BUTTON_MOTION}`;

export default function GenerateConfirmModal({
    open,
    previewUrl,
    showDefaultColorNote,
    detectedGarment,
    onBack,
    onContinue,
}: GenerateConfirmModalProps) {
    const reduceMotion = useReducedMotion();
    const titleId = useId();
    const descriptionId = useId();
    const noteId = useId();
    const categoryTitleId = useId();
    const categoryDescriptionId = useId();
    const backRef = useRef<HTMLButtonElement>(null);
    const categoryBackRef = useRef<HTMLButtonElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);

    const [step, setStep] = useState<ModalStep>('preview');
    const [stepDirection, setStepDirection] = useState(1);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const hasDetectedGarment = detectedGarment !== null;
    const filteredCategories = filterGenerationCategories(searchQuery);
    const selectedCategory = selectedCategoryId
        ? getGenerationCategoryById(selectedCategoryId)
        : undefined;
    const trimmedSearch = searchQuery.trim();
    const hasNonOtherMatches = filteredCategories.some((category) => category.id !== 'other');
    const showSearchEmpty = trimmedSearch.length > 0 && !hasNonOtherMatches;

    useEffect(() => {
        if (!open) {
            setStep('preview');
            setStepDirection(1);
            setSearchQuery('');
            setSelectedCategoryId(null);
            return;
        }

        setStep('preview');
        setStepDirection(1);
        setSearchQuery('');
        setSelectedCategoryId(detectedGarment?.generationCategoryId ?? null);
    }, [open, detectedGarment]);

    const goToCategoryStep = useCallback(() => {
        setStepDirection(1);
        setStep('category');
    }, []);

    const goToPreviewStep = useCallback(() => {
        setStepDirection(-1);
        setStep('preview');
    }, []);

    const close = useCallback(() => {
        onBack();
    }, [onBack]);

    const handleGenerateFromPreview = useCallback(() => {
        if (!detectedGarment) {
            return;
        }
        onContinue({
            generationCategoryId: detectedGarment.generationCategoryId,
            garmentLabel: detectedGarment.garmentLabel,
        });
    }, [detectedGarment, onContinue]);

    const handleGenerateFromCategory = useCallback(() => {
        if (!selectedCategoryId) {
            return;
        }
        onContinue({
            generationCategoryId: selectedCategoryId,
            garmentLabel: resolveGarmentLabelForCategoryId(selectedCategoryId),
        });
    }, [onContinue, selectedCategoryId]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (step === 'category') {
                    goToPreviewStep();
                    return;
                }
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
        const focusTarget = step === 'category' ? categoryBackRef : backRef;
        const focusTimer = window.setTimeout(() => focusTarget.current?.focus(), 0);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
            window.clearTimeout(focusTimer);
        };
    }, [open, close, goToPreviewStep, step]);

    const instant = reduceMotion ? { duration: 0 } : undefined;
    const overlayMotion = reduceMotion
        ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: instant }
        : {
              variants: overlayVariants,
              initial: 'hidden' as const,
              animate: 'visible' as const,
              exit: 'exit' as const,
          };
    const dialogMotion = reduceMotion
        ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: instant }
        : {
              variants: dialogVariants,
              initial: 'hidden' as const,
              animate: 'visible' as const,
              exit: 'exit' as const,
          };

    const previewDescribedBy = showDefaultColorNote
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
                    {...overlayMotion}
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            if (step === 'category') {
                                goToPreviewStep();
                                return;
                            }
                            close();
                        }
                    }}
                >
                    <motion.div
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={step === 'preview' ? titleId : categoryTitleId}
                        aria-describedby={
                            step === 'preview' ? previewDescribedBy : categoryDescriptionId
                        }
                        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/35 bg-white/80 p-6 shadow-[0_40px_120px_-30px_rgba(15,17,21,0.5)] backdrop-blur-xl will-change-transform"
                        {...dialogMotion}
                    >
                        <div className="pointer-events-none absolute inset-0 -z-10">
                            <div className="absolute -left-8 -top-10 h-44 w-44 rounded-full bg-[#8B5CF6]/30 blur-3xl" />
                            <div className="absolute -right-4 top-1/3 h-44 w-44 rounded-full bg-[#06B6D4]/25 blur-3xl" />
                            <div className="absolute bottom-0 left-1/3 h-36 w-36 rounded-full bg-[#D946EF]/20 blur-3xl" />
                        </div>

                        <AnimatePresence mode="wait" custom={stepDirection} initial={false}>
                            {step === 'preview' ? (
                                <motion.div
                                    key="preview"
                                    custom={stepDirection}
                                    variants={reduceMotion ? undefined : stepVariants}
                                    initial={reduceMotion ? false : 'enter'}
                                    animate="center"
                                    exit={reduceMotion ? undefined : 'exit'}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 ring-1 ring-violet-200/80">
                                            <Sparkles size={22} aria-hidden />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h2
                                                id={titleId}
                                                className="font-raleway text-2xl font-bold text-gray-900"
                                            >
                                                Ready to generate?
                                            </h2>
                                            <p
                                                id={descriptionId}
                                                className="mt-2 text-sm leading-relaxed text-gray-600"
                                            >
                                                Here&apos;s how your sketch will be used. Go back to keep
                                                editing, or continue.
                                            </p>
                                            {showDefaultColorNote ? (
                                                <p
                                                    id={noteId}
                                                    className="mt-2 text-sm font-semibold text-violet-700"
                                                >
                                                    No color hints have been added, a default color will be
                                                    applied.
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-3 shadow-sm">
                                        <div className="mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-xl border border-gray-100 bg-white">
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

                                    {hasDetectedGarment ? (
                                        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                                            <span>From your template:</span>
                                            <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-900">
                                                {detectedGarment.garmentLabel}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={goToCategoryStep}
                                                className="text-sm font-medium text-violet-600 underline-offset-2 hover:text-violet-800 hover:underline"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    ) : null}

                                    <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                                        <button
                                            ref={backRef}
                                            type="button"
                                            onClick={onBack}
                                            className={outlineButtonClass}
                                        >
                                            Back to canvas
                                        </button>
                                        {hasDetectedGarment ? (
                                            <button
                                                type="button"
                                                onClick={handleGenerateFromPreview}
                                                className={emeraldButtonClass}
                                            >
                                                Generate
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={goToCategoryStep}
                                                className={`inline-flex items-center justify-center gap-1.5 ${emeraldButtonClass}`}
                                            >
                                                Choose category
                                                <ChevronRight size={18} aria-hidden />
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="category"
                                    custom={stepDirection}
                                    variants={reduceMotion ? undefined : stepVariants}
                                    initial={reduceMotion ? false : 'enter'}
                                    animate="center"
                                    exit={reduceMotion ? undefined : 'exit'}
                                >
                                    <div>
                                        <h2
                                            id={categoryTitleId}
                                            className="font-raleway text-2xl font-bold text-gray-900"
                                        >
                                            What did you draw?
                                        </h2>
                                        <p
                                            id={categoryDescriptionId}
                                            className="mt-2 text-sm leading-relaxed text-gray-600"
                                        >
                                            Pick the clothing type that best matches your sketch.
                                        </p>
                                    </div>

                                    <div className="relative mt-4">
                                        <Search
                                            size={16}
                                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                            aria-hidden
                                        />
                                        <input
                                            type="search"
                                            value={searchQuery}
                                            onChange={(event) => setSearchQuery(event.target.value)}
                                            placeholder="Search…"
                                            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-200"
                                        />
                                    </div>

                                    <div className="mt-4 max-h-52 overflow-y-auto rounded-xl border border-gray-200/80 bg-white/90 p-2">
                                        {showSearchEmpty ? (
                                            <p className="px-2 py-3 text-center text-sm text-gray-500">
                                                No results for &ldquo;{trimmedSearch}&rdquo;. Try
                                                another word.
                                            </p>
                                        ) : null}
                                        <div className="grid grid-cols-2 gap-2">
                                            {filteredCategories.map((category) => {
                                                    const isSelected =
                                                        selectedCategoryId === category.id;
                                                    return (
                                                        <button
                                                            key={category.id}
                                                            type="button"
                                                            onClick={() =>
                                                                setSelectedCategoryId(category.id)
                                                            }
                                                            className={`inline-flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${INTERACTIVE_BUTTON_MOTION} ${
                                                                isSelected
                                                                    ? 'border-violet-500 bg-violet-50 font-medium text-violet-700'
                                                                    : 'border-gray-200 bg-white text-gray-700 hover:border-violet-200 hover:bg-violet-50/50'
                                                            }`}
                                                        >
                                                            <span>{category.label}</span>
                                                            {isSelected ? (
                                                                <Check
                                                                    size={16}
                                                                    className="shrink-0 text-violet-600"
                                                                    aria-hidden
                                                                />
                                                            ) : null}
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                    </div>

                                    {selectedCategory ? (
                                        <p className="mt-3 text-sm font-medium text-violet-600">
                                            Selected:{' '}
                                            <span className="font-semibold text-violet-800">
                                                {selectedCategory.label}
                                            </span>
                                        </p>
                                    ) : null}

                                    <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                                        <button
                                            ref={categoryBackRef}
                                            type="button"
                                            onClick={goToPreviewStep}
                                            className={outlineButtonClass}
                                        >
                                            ← Back
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleGenerateFromCategory}
                                            disabled={!selectedCategoryId}
                                            className={emeraldButtonClass}
                                        >
                                            Generate
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
