'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Editor } from 'tldraw';
import { getEditorSnapshot } from '@/lib/tldraw-utils';

export type DraftSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const DRAFT_AUTOSAVE_ERROR_MESSAGE =
    "Couldn't autosave your sketch. Use Save draft or check your connection before leaving.";

type Options = {
    enabled: boolean;
    user: User | null;
    intervalMs?: number;
};

const CHANGE_DEBOUNCE_MS = 2_000;

/**
 * POST /api/realize/drafts/save on an interval (default 60s) and after canvas edits.
 * Persists empty canvases too so clearing/deleting all shapes survives reload.
 */
export function useDraftAutosave(editor: Editor | null, options: Options) {
    const { enabled, user, intervalMs = 60_000 } = options;
    const [status, setStatus] = useState<DraftSaveStatus>('idle');
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
    const saveInFlightRef = useRef(false);
    const savePendingRef = useRef(false);

    const saveNow = useCallback(async (): Promise<{
        ok: boolean;
        draft_id?: number;
        reason?: 'disabled' | 'error';
    }> => {
        if (!editor || !user || !enabled) {
            return { ok: false, reason: 'disabled' };
        }

        if (saveInFlightRef.current) {
            savePendingRef.current = true;
            return { ok: false, reason: 'disabled' };
        }

        saveInFlightRef.current = true;
        const snapshot = getEditorSnapshot(editor) as unknown as Record<string, unknown>;
        const payload = JSON.stringify({ sketch_json: snapshot });

        setStatus('saving');
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/realize/drafts/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: payload,
            });
            if (!res.ok) {
                const t = await res.text();
                throw new Error(t || res.statusText);
            }
            const body = (await res.json().catch(() => ({}))) as { draft_id?: number };
            const draft_id = typeof body.draft_id === 'number' ? body.draft_id : undefined;
            setStatus('saved');
            setSaveErrorMessage(null);
            setLastSavedAt(new Date());
            return { ok: true, draft_id };
        } catch (e) {
            console.error('Draft autosave failed:', e);
            setStatus('error');
            setSaveErrorMessage(DRAFT_AUTOSAVE_ERROR_MESSAGE);
            return { ok: false, reason: 'error' };
        } finally {
            saveInFlightRef.current = false;
            if (savePendingRef.current) {
                savePendingRef.current = false;
                void saveNow();
            }
        }
    }, [editor, user, enabled]);

    const clearSaveError = useCallback(() => {
        setSaveErrorMessage(null);
        setStatus((current) => (current === 'error' ? 'idle' : current));
    }, []);

    useEffect(() => {
        if (!editor || !user || !enabled) {
            return;
        }
        const id = window.setInterval(() => {
            void saveNow();
        }, intervalMs);
        return () => window.clearInterval(id);
    }, [editor, user, enabled, intervalMs, saveNow]);

    /** Debounced save on user edits; immediate save when any shapes are deleted. */
    useEffect(() => {
        if (!editor || !user || !enabled) {
            return;
        }

        let debounceId: number | undefined;
        let prevShapeCount = editor.getCurrentPageShapeIds().size;

        const scheduleSave = (immediate = false) => {
            if (debounceId !== undefined) {
                window.clearTimeout(debounceId);
                debounceId = undefined;
            }
            if (immediate) {
                void saveNow();
                return;
            }
            debounceId = window.setTimeout(() => {
                debounceId = undefined;
                void saveNow();
            }, CHANGE_DEBOUNCE_MS);
        };

        const removeListener = editor.store.listen(
            () => {
                const shapeCount = editor.getCurrentPageShapeIds().size;
                if (shapeCount < prevShapeCount) {
                    prevShapeCount = shapeCount;
                    scheduleSave(true);
                    return;
                }
                prevShapeCount = shapeCount;
                scheduleSave(false);
            },
            { source: 'user', scope: 'document' }
        );

        return () => {
            removeListener();
            if (debounceId !== undefined) {
                window.clearTimeout(debounceId);
            }
        };
    }, [editor, user, enabled, saveNow]);

    return { status, lastSavedAt, saveErrorMessage, clearSaveError, saveNow };
}
