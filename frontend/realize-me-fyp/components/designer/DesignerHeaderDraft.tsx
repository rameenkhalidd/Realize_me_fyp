'use client';

import { usePathname } from 'next/navigation';
import { AlertCircle, CheckCircle2, Cloud, Loader2, Save } from 'lucide-react';

import { useDesignerDraftOptional } from '@/components/designer/DesignerDraftContext';
import { DRAFT_AUTOSAVE_ERROR_MESSAGE } from '@/hooks/useDraftAutosave';

/** Draft status + save control for the designer header (design canvas route only). */
export default function DesignerHeaderDraft() {
    const pathname = usePathname();
    const draft = useDesignerDraftOptional();

    if (!draft?.visible || pathname !== '/designer') {
        return null;
    }

    const { status, lastSavedAt, saveDisabled, saveDraft } = draft;
    const isSaving = status === 'saving';
    const isError = status === 'error';

    let StatusIcon = Cloud;
    let statusLine = 'Autosaves to your account';

    if (isSaving) {
        StatusIcon = Loader2;
        statusLine = 'Saving…';
    } else if (isError) {
        StatusIcon = AlertCircle;
        statusLine = 'Autosave failed — tap Save';
    } else if (lastSavedAt) {
        StatusIcon = CheckCircle2;
        statusLine = `Saved · ${lastSavedAt.toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
        })}`;
    }

    return (
        <div className="flex items-center gap-2 sm:gap-3">
            <div
                className={`min-w-0 items-center gap-1.5 flex ${isError ? '' : 'hidden sm:flex'}`}
                aria-live="polite"
                title={isError ? DRAFT_AUTOSAVE_ERROR_MESSAGE : undefined}
            >
                <StatusIcon
                    className={`h-3.5 w-3.5 shrink-0 ${
                        isSaving
                            ? 'animate-spin text-violet-600'
                            : isError
                              ? 'text-red-500'
                              : lastSavedAt
                                ? 'text-emerald-600'
                                : 'text-slate-400'
                    }`}
                    aria-hidden
                />
                <span
                    className={`max-w-[9rem] truncate text-xs md:max-w-[11rem] ${
                        isError ? 'font-medium text-red-700' : 'text-slate-600'
                    }`}
                >
                    {statusLine}
                </span>
            </div>
            <button
                type="button"
                onClick={() => void saveDraft()}
                disabled={saveDisabled}
                title="Saves sketch to your account—not a file download"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-violet-200/90 bg-white px-2.5 py-1.5 text-xs font-medium text-violet-900 shadow-sm transition-colors hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <Save className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="hidden md:inline">Save draft</span>
                <span className="md:hidden">Save</span>
            </button>
        </div>
    );
}
