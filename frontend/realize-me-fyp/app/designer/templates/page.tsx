'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LayoutTemplate } from 'lucide-react';

import { useAuth } from '@/components/auth/AuthProvider';
import { TEMPLATES, type TemplateItem } from '@/components/designer/templates';
import { DESIGNER_LAVENDER_PAGE_BACKGROUND } from '@/lib/designer-page-background';
import { snapshotHasShapes } from '@/lib/tldraw-utils';

const CATEGORIES = ['all', 'shirt', 'hoodie', 'dress', 'jackets', 'pants', 'shorts', 'skirt', 'tank-tops'] as const;
const PENDING_TEMPLATE_STORAGE_KEY = 'realizeme:pendingTemplate';

const FOCUSABLE =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type TemplateReplaceConfirmModalProps = {
    open: boolean;
    templateName: string;
    onCancel: () => void;
    onConfirm: () => void;
};

function TemplateReplaceConfirmModal({
    open,
    templateName,
    onCancel,
    onConfirm,
}: TemplateReplaceConfirmModalProps) {
    const [mounted, setMounted] = useState(false);
    const reduceMotion = useReducedMotion();
    const titleId = useId();
    const descriptionId = useId();
    const cancelRef = useRef<HTMLButtonElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!open) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onCancel();
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
    }, [open, onCancel]);

    const instant = reduceMotion ? { duration: 0 } : undefined;

    if (!mounted) {
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
                            onCancel();
                        }
                    }}
                >
                    <motion.div
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        aria-describedby={descriptionId}
                        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/35 bg-white/80 p-6 shadow-[0_40px_120px_-30px_rgba(15,17,21,0.5)] backdrop-blur-xl"
                        initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.99 }}
                        transition={instant ?? { type: 'spring', stiffness: 360, damping: 34 }}
                    >
                        <div className="pointer-events-none absolute inset-0 -z-10">
                            <div className="absolute -left-8 -top-10 h-44 w-44 rounded-full bg-[#8B5CF6]/30 blur-3xl" />
                            <div className="absolute -right-4 top-1/3 h-44 w-44 rounded-full bg-[#06B6D4]/25 blur-3xl" />
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 ring-1 ring-violet-200/80">
                                <LayoutTemplate size={24} aria-hidden />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 id={titleId} className="font-raleway text-2xl font-bold text-gray-900">
                                    Replace current sketch?
                                </h2>
                                <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-gray-600">
                                    Starting <span className="font-semibold text-gray-800">{templateName}</span>{' '}
                                    clears your canvas and replaces your saved draft. Your current drawing
                                    can&apos;t be recovered.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <button
                                ref={cancelRef}
                                type="button"
                                onClick={onCancel}
                                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
                                style={{
                                    background: 'linear-gradient(to right, #a78bfa, #c084fc, #67e8f9)',
                                }}
                            >
                                Continue with template
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}

export default function TemplatesPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [selected, setSelected] = useState<TemplateItem | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [checkingDraft, setCheckingDraft] = useState(false);

    const filtered = activeCategory === 'all'
        ? TEMPLATES
        : TEMPLATES.filter(t => t.category === activeCategory);

    const proceedWithTemplate = useCallback(
        (template: TemplateItem) => {
            sessionStorage.setItem(
                PENDING_TEMPLATE_STORAGE_KEY,
                JSON.stringify({
                    id: template.id,
                    src: template.src,
                    name: template.name,
                    category: template.category,
                    garmentLabel: template.garmentLabel,
                    generationCategoryId: template.generationCategoryId,
                })
            );
            router.push('/designer');
        },
        [router]
    );

    const draftHasShapes = useCallback(async (): Promise<boolean> => {
        if (!user) {
            return false;
        }
        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/realize/drafts/latest', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                return false;
            }
            const data = (await response.json()) as { draft?: { sketch_json?: unknown } };
            const sketch = data.draft?.sketch_json;
            return snapshotHasShapes(sketch);
        } catch {
            return false;
        }
    }, [user]);

    const handleEdit = async () => {
        if (!selected || checkingDraft) {
            return;
        }

        if (!user) {
            proceedWithTemplate(selected);
            return;
        }

        setCheckingDraft(true);
        try {
            const hasWork = await draftHasShapes();
            if (hasWork) {
                setConfirmOpen(true);
            } else {
                proceedWithTemplate(selected);
            }
        } finally {
            setCheckingDraft(false);
        }
    };

    const handleConfirmReplace = () => {
        if (!selected) {
            return;
        }
        setConfirmOpen(false);
        proceedWithTemplate(selected);
    };

    return (
        <>
            <div
                className="flex h-full flex-col overflow-hidden"
                style={{ background: DESIGNER_LAVENDER_PAGE_BACKGROUND }}
                onClick={() => setSelected(null)}
            >
                {/* Header */}
                <div className="shrink-0 border-b border-purple-100 bg-white/70 px-6 py-5 backdrop-blur-sm">
                    <h1 className="font-raleway text-xl font-bold text-gray-900">Templates</h1>
                    <p className="mt-0.5 text-xs text-gray-500">
                        Pick a base design — you&apos;ll draw over it on the canvas
                    </p>
                </div>

                {/* Category Pills */}
                <div
                    className="flex shrink-0 gap-2 overflow-x-auto border-b border-purple-100 bg-white/60 px-6 py-3 backdrop-blur-sm"
                    onClick={(e) => e.stopPropagation()}
                >
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveCategory(cat);
                            }}
                            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors font-roboto ${
                                activeCategory === cat
                                    ? 'text-white shadow-sm'
                                    : 'bg-white/80 text-gray-500 border border-purple-100 hover:bg-purple-50 hover:text-purple-600'
                            }`}
                            style={activeCategory === cat ? {
                                background: 'linear-gradient(to right, #a78bfa, #c084fc, #67e8f9)',
                            } : undefined}
                        >
                            {cat === 'all' ? 'All' : cat}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filtered.map((t) => {
                            const isSelected = selected?.id === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelected(isSelected ? null : t);
                                    }}
                                    className={`group relative overflow-hidden rounded-2xl border bg-white/80 p-3 text-left transition-all shadow-sm hover:shadow-md backdrop-blur-sm ${
                                        isSelected
                                            ? 'border-purple-300 ring-2 ring-purple-200/60'
                                            : 'border-purple-100 hover:border-purple-300'
                                    }`}
                                >
                                    {isSelected && (
                                        <div
                                            className="absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full text-white text-[10px] font-bold shadow-sm"
                                            style={{ background: 'linear-gradient(to right, #a78bfa, #c084fc)' }}
                                        >
                                            ✓
                                        </div>
                                    )}

                                    <div className={`relative h-48 w-full overflow-hidden rounded-xl transition-colors ${
                                        isSelected ? 'bg-purple-50/80' : 'bg-gray-50/80 group-hover:bg-purple-50/50'
                                    }`}>
                                        <Image
                                            src={t.src}
                                            alt={t.name}
                                            fill
                                            className="object-contain p-2 transition-transform group-hover:scale-105"
                                        />
                                    </div>

                                    <p className="mt-2 text-sm font-semibold text-gray-800 font-raleway">{t.name}</p>
                                    <p className="text-[11px] text-gray-400 capitalize font-roboto">{t.category}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Bottom bar */}
                {selected && (
                    <div
                        className="shrink-0 border-t border-purple-100 bg-white/80 px-6 py-3 flex items-center justify-between backdrop-blur-sm shadow-[0_-2px_12px_rgba(139,92,246,0.06)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-purple-50 border border-purple-100">
                                <Image
                                    src={selected.src}
                                    alt={selected.name}
                                    fill
                                    className="object-contain p-1"
                                />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900 font-raleway">{selected.name}</p>
                                <p className="text-[11px] text-gray-400 font-roboto">Starts a fresh canvas — replaces your current sketch</p>
                            </div>
                        </div>
                        <button
                            onClick={() => void handleEdit()}
                            disabled={checkingDraft}
                            className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm font-roboto"
                            style={{ background: 'linear-gradient(to right, #a78bfa, #c084fc, #67e8f9)' }}
                        >
                            {checkingDraft ? 'Checking…' : 'Edit on Canvas →'}
                        </button>
                    </div>
                )}
            </div>

            {selected ? (
                <TemplateReplaceConfirmModal
                    open={confirmOpen}
                    templateName={selected.name}
                    onCancel={() => setConfirmOpen(false)}
                    onConfirm={handleConfirmReplace}
                />
            ) : null}
        </>
    );
}
