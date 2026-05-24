'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Editor } from 'tldraw';
import { getEditorSnapshot } from '@/lib/tldraw-utils';

export type DraftSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type Options = {
    enabled: boolean;
    user: User | null;
    intervalMs?: number;
};

/**
 * POST /api/realize/drafts/save on an interval (default 60s) with the latest tldraw store snapshot.
 * Skips when the canvas has no shapes (nothing to persist).
 */
export function useDraftAutosave(editor: Editor | null, options: Options) {
    const { enabled, user, intervalMs = 60_000 } = options;
    const [status, setStatus] = useState<DraftSaveStatus>('idle');
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

    const saveNow = useCallback(async (): Promise<{
        ok: boolean;
        draft_id?: number;
        reason?: 'disabled' | 'empty' | 'error';
    }> => {
        if (!editor || !user || !enabled) {
            return { ok: false, reason: 'disabled' };
        }
        if (editor.getCurrentPageShapeIds().size === 0) {
            return { ok: false, reason: 'empty' };
        }

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
            setLastSavedAt(new Date());
            return { ok: true, draft_id };
        } catch (e) {
            console.error('Draft autosave failed:', e);
            setStatus('error');
            return { ok: false, reason: 'error' };
        }
    }, [editor, user, enabled]);

    useEffect(() => {
        if (!editor || !user || !enabled) {
            return;
        }
        const id = window.setInterval(() => {
            void saveNow();
        }, intervalMs);
        return () => window.clearInterval(id);
    }, [editor, user, enabled, intervalMs, saveNow]);

    return { status, lastSavedAt, saveNow };
}
