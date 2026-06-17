'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import type { Editor } from 'tldraw';

import { useAuth } from '@/components/auth/AuthProvider';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { useDraftAutosave, type DraftSaveStatus } from '@/hooks/useDraftAutosave';

export type DesignerDraftContextValue = {
    visible: boolean;
    status: DraftSaveStatus;
    lastSavedAt: Date | null;
    saveErrorMessage: string | null;
    saveDisabled: boolean;
    saveDraft: () => Promise<void>;
    clearSaveError: () => void;
    registerEditor: (editor: Editor | null) => void;
    setGenerateActive: (active: boolean) => void;
    /** Any shapes on the designer canvas (strokes, imports, templates). Read-only for sign-out copy. */
    hasCanvasShapes: boolean;
};

const DesignerDraftContext = createContext<DesignerDraftContextValue | null>(null);

export function DesignerDraftProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [editor, setEditor] = useState<Editor | null>(null);
    const [generateActive, setGenerateActive] = useState(false);
    const [hasCanvasShapes, setHasCanvasShapes] = useState(false);

    const draftsEnabled = isFirebaseConfigured() && !!user;
    const { status, lastSavedAt, saveErrorMessage, clearSaveError, saveNow } = useDraftAutosave(editor, {
        enabled: draftsEnabled,
        user: user ?? null,
    });

    const registerEditor = useCallback((next: Editor | null) => {
        setEditor(next);
    }, []);

    useEffect(() => {
        if (!editor) {
            setHasCanvasShapes(false);
            return;
        }
        const update = () => {
            setHasCanvasShapes(editor.getCurrentPageShapeIds().size > 0);
        };
        update();
        const removeListener = editor.store.listen(update, { scope: 'document' });
        return () => removeListener();
    }, [editor]);

    const saveDraft = useCallback(async () => {
        if (!draftsEnabled) {
            return;
        }
        const result = await saveNow();
        if (!result.ok) {
            return;
        }
        if (result.draft_id != null && user) {
            try {
                const token = await user.getIdToken();
                await fetch('/api/realize/drafts/archive', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ draft_id: result.draft_id }),
                });
            } catch (e) {
                console.warn('Mark draft saved failed:', e);
            }
        }
    }, [draftsEnabled, saveNow, user]);

    const value = useMemo(
        () => ({
            visible: draftsEnabled,
            status,
            lastSavedAt,
            saveErrorMessage,
            saveDisabled: generateActive || status === 'saving',
            saveDraft,
            clearSaveError,
            registerEditor,
            setGenerateActive: setGenerateActive,
            hasCanvasShapes,
        }),
        [draftsEnabled, status, lastSavedAt, saveErrorMessage, generateActive, saveDraft, clearSaveError, registerEditor, hasCanvasShapes]
    );

    return (
        <DesignerDraftContext.Provider value={value}>{children}</DesignerDraftContext.Provider>
    );
}

export function useDesignerDraft(): DesignerDraftContextValue {
    const ctx = useContext(DesignerDraftContext);
    if (!ctx) {
        throw new Error('useDesignerDraft must be used within DesignerDraftProvider');
    }
    return ctx;
}

/** Optional hook for canvas when provider may be absent (should not happen on /designer). */
export function useDesignerDraftOptional() {
    return useContext(DesignerDraftContext);
}
