'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Editor, Tldraw, type TLStoreSnapshot } from 'tldraw';
import 'tldraw/tldraw.css';

import { useAuth } from '@/components/auth/AuthProvider';
import {
    blobToBase64,
    exportCanvasToBlob,
    exportColorHintsPngBlob,
    exportSketchPngBlob,
    getEditorSnapshot,
    hasColorHintShapes,
    hasOutlineShapes,
    loadEditorSnapshot,
} from '@/lib/tldraw-utils';
import SynthesisPreviewModal from '@/components/designer/SynthesisPreviewModal';
import {
    HISTORY_ID_STORAGE_KEY,
    RECOVER_SKETCH_STORAGE_KEY,
    RESULTS_ENTRY_WELCOME_KEY,
} from '@/lib/results-entry';
import { validateImageFileForCanvas } from '@/lib/image-import-limits';
import { patchDesignerImageImportLimits } from '@/lib/tldraw-patch-image-imports';
import { getFirebaseAuth } from '@/lib/firebase/client-app';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { useDesignerDraft } from '@/components/designer/DesignerDraftContext';

import CustomToolbar from './CustomToolbar';
import CustomStylePanel from './CustomStylePanel';
import CanvasFileMenu from './CanvasFileMenu';
import { DrawingModeProvider } from './DrawingModeContext';
import { GenerateFlowProvider } from './GenerateFlowContext';

const USE_MOCK_GENERATION = process.env.NEXT_PUBLIC_USE_MOCK_GENERATION === 'true';

const EMPTY_CANVAS_TOAST_MESSAGE = 'Canvas is empty, Add a sketch to generate.';
const NO_OUTLINE_TOAST_MESSAGE = 'Draw an outline first (Outline mode).';
const NO_COLOR_HINTS_TOAST_MESSAGE =
    'No color hints added — a default color will be applied.';

const STORAGE_QUOTA_USER_MESSAGE =
    'This design is too large to generate an image. Try removing large image imports or simplifying the sketch.';
const AUTH_REQUIRED_USER_MESSAGE = 'Your session expired. Please sign in again to generate.';

const TOAST_OUTER_CLASS =
    'fixed left-1/2 z-10050 w-[min(calc(100vw-2rem),24rem)] -translate-x-1/2 rounded-xl border border-purple-200/90 bg-white/95 px-4 py-3 font-roboto shadow-md backdrop-blur-sm ring-1 ring-violet-500/10 transition-opacity duration-200';

const SYNTHESIS_STEPS = [
    'Reading sketch lines and proportions...',
    'Inferring garment silhouette and structure...',
    'Applying texture and style cues...',
    'Refining final render details...',
] as const;

type GenerateResponse = {
    success?: boolean;
    generatedImage?: string;
    image_base64?: string;
    history_id?: number;
    generated_image_url?: string;
    session_id?: string;
    message?: string;
    error?: string;
    details?: string;
    mode?: 'mock' | 'proxy';
};

function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getBearerTokenForApi() {
    const auth = getFirebaseAuth();
    const currentUser = auth?.currentUser;
    if (!currentUser) {
        throw new Error(AUTH_REQUIRED_USER_MESSAGE);
    }

    try {
        return await currentUser.getIdToken();
    } catch {
        throw new Error(AUTH_REQUIRED_USER_MESSAGE);
    }
}

export default function DesignerCanvas() {
    const { user } = useAuth();
    const [editor, setEditor] = useState<Editor | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showCanvasGuide, setShowCanvasGuide] = useState(false);
    const [isSynthesisPreviewOpen, setIsSynthesisPreviewOpen] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isDemoMode, setIsDemoMode] = useState(USE_MOCK_GENERATION);
    const [pendingGeneration, setPendingGeneration] = useState<{
        sketchBlob: Blob;
        colorHintsBlob: Blob;
        previewBlob: Blob;
    } | null>(null);
    const [canvasToast, setCanvasToast] = useState<string | null>(null);
    const [importToast, setImportToast] = useState<string | null>(null);
    const [storageQuotaError, setStorageQuotaError] = useState(false);
    const router = useRouter();
    const draftRecoveredRef = useRef(false);
    const { registerEditor, setGenerateActive } = useDesignerDraft();

    useEffect(() => {
        registerEditor(editor);
        return () => registerEditor(null);
    }, [editor, registerEditor]);

    useEffect(() => {
        setGenerateActive(isGenerating);
    }, [isGenerating, setGenerateActive]);

    const notifyEmptyCanvas = useCallback(() => {
        setCanvasToast(EMPTY_CANVAS_TOAST_MESSAGE);
    }, []);

    const notifyImportRejected = useCallback((message: string) => {
        setImportToast(message);
    }, []);

    const generateFlowValue = useMemo(
        () => ({ isGenerating, notifyEmptyCanvas, notifyImportRejected }),
        [isGenerating, notifyEmptyCanvas, notifyImportRejected]
    );

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const dismissed = sessionStorage.getItem('realizeme:canvasGuideDismissed');
        if (!dismissed) {
            setShowCanvasGuide(true);
        }
    }, []);

    useEffect(() => {
        if (!isGenerating) return;

        const interval = window.setInterval(() => {
            setElapsedSeconds((current) => current + 1);
        }, 1000);

        return () => window.clearInterval(interval);
    }, [isGenerating]);

    useEffect(() => {
        if (!canvasToast) return;
        const id = window.setTimeout(() => setCanvasToast(null), 5000);
        return () => window.clearTimeout(id);
    }, [canvasToast]);

    useEffect(() => {
        if (!importToast) return;
        const id = window.setTimeout(() => setImportToast(null), 5000);
        return () => window.clearTimeout(id);
    }, [importToast]);

    /** With `hideUi`, tldraw does not mount clipboard handlers; guard image paste the same as drop/import. */
    useEffect(() => {
        if (!editor) return;
        const root = editor.getContainer();
        const doc = root?.ownerDocument ?? document;

        const isTypingTarget = (el: Element | null) => {
            if (!el || !(el instanceof HTMLElement)) return false;
            const tag = el.tagName.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
            return el.isContentEditable;
        };

        const onPaste = async (e: ClipboardEvent) => {
            if (!editor.getInstanceState().isFocused) return;
            if (editor.getEditingShapeId() !== null) return;
            if (isTypingTarget(doc.activeElement)) return;

            const cd = e.clipboardData;
            if (!cd) return;

            const imageFiles = Array.from(cd.files).filter((f) => f.type.startsWith('image/'));
            if (imageFiles.length === 0) return;

            e.preventDefault();
            e.stopPropagation();

            if (imageFiles.length > editor.options.maxFilesAtOnce) return;

            for (const file of imageFiles) {
                const result = await validateImageFileForCanvas(file);
                if (!result.ok) {
                    notifyImportRejected(result.message);
                    return;
                }
            }

            const point = editor.getViewportPageBounds().center;
            await editor.putExternalContent({
                type: 'files',
                files: imageFiles,
                point,
            });
        };

        doc.addEventListener('paste', onPaste, { capture: true });
        return () => doc.removeEventListener('paste', onPaste, { capture: true });
    }, [editor, notifyImportRejected]);

    /** Recover sketch from history handoff or latest server draft (once per mount). */
    useEffect(() => {
        if (!editor || !isFirebaseConfigured() || draftRecoveredRef.current) {
            return;
        }

        const recoverRaw = sessionStorage.getItem(RECOVER_SKETCH_STORAGE_KEY);
        if (recoverRaw) {
            try {
                const sketch = JSON.parse(recoverRaw) as TLStoreSnapshot;
                loadEditorSnapshot(editor, sketch);
                sessionStorage.removeItem(RECOVER_SKETCH_STORAGE_KEY);
                draftRecoveredRef.current = true;
                return;
            } catch {
                sessionStorage.removeItem(RECOVER_SKETCH_STORAGE_KEY);
            }
        }

        if (!user) {
            return;
        }

        let cancelled = false;
        void (async () => {
            try {
                const token = await user.getIdToken();
                const r = await fetch('/api/realize/drafts/latest', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!r.ok || cancelled) {
                    return;
                }
                const j = (await r.json()) as { draft?: { sketch_json?: unknown } };
                const sketch = j.draft?.sketch_json;
                if (!sketch || typeof sketch !== 'object' || cancelled) {
                    draftRecoveredRef.current = true;
                    return;
                }
                loadEditorSnapshot(editor, sketch as TLStoreSnapshot);
                draftRecoveredRef.current = true;
            } catch (e) {
                console.error('Draft recovery failed:', e);
                draftRecoveredRef.current = true;
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [editor, user]);

    const currentStep = SYNTHESIS_STEPS[Math.floor(elapsedSeconds / 3) % SYNTHESIS_STEPS.length];

    const runMockGeneration = async (sketchImage: string): Promise<GenerateResponse> => {
        const delayMs = 4200 + Math.floor(Math.random() * 2200);
        await wait(delayMs);
        return {
            success: true,
            generatedImage: sketchImage,
            mode: 'mock',
            message:
                'Preview: your sketch is shown in both panels until full rendering is connected to your account.',
        };
    };

    const startGeneration = async (payload: {
        sketchBlob: Blob;
        colorHintsBlob: Blob;
        previewBlob: Blob;
    }) => {
        const { sketchBlob, colorHintsBlob, previewBlob } = payload;
        setIsSynthesisPreviewOpen(true);
        setGenerationError(null);
        setStorageQuotaError(false);
        setElapsedSeconds(0);
        setIsGenerating(true);
        setPendingGeneration(payload);

        let shouldStopGenerating = true;

        try {
            const sketchImage = await blobToBase64(previewBlob);
            const startedAt = Date.now();
            let data: GenerateResponse;

            if (USE_MOCK_GENERATION) {
                setIsDemoMode(true);
                data = await runMockGeneration(sketchImage);
            } else {
                const idToken = await getBearerTokenForApi();
                const formData = new FormData();
                formData.append('file', sketchBlob, 'sketch.png');
                formData.append('sketch_file', sketchBlob, 'sketch.png');
                formData.append('color_hints_file', colorHintsBlob, 'color_hints.png');
                formData.append('preview_file', previewBlob, 'preview.png');
                if (editor) {
                    formData.append('sketch_json', JSON.stringify(getEditorSnapshot(editor)));
                }

                const response = await fetch('/api/generate', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: formData,
                });

                const rawBody = await response.text();
                try {
                    data = JSON.parse(rawBody) as GenerateResponse;
                } catch {
                    throw new Error(
                        `Generate request failed (${response.status}). Restart the Next.js dev server after changing REALIZEME_BACKEND_URL.`
                    );
                }

                if (!response.ok || data.success === false) {
                    const combined = [data.error, data.details].filter(Boolean).join(' — ');
                    throw new Error(combined || 'Failed to generate image');
                }

                setIsDemoMode(data.mode === 'mock');
            }

            const generatedImage =
                data.generatedImage ||
                (typeof data.image_base64 === 'string' ? `data:image/png;base64,${data.image_base64}` : '');

            if (!generatedImage) {
                throw new Error('Generation response did not include an image');
            }

            // Keep preview visible briefly so it never flashes too fast.
            const minimumPreviewMs = 1800;
            const elapsedMs = Date.now() - startedAt;
            if (elapsedMs < minimumPreviewMs) {
                await wait(minimumPreviewMs - elapsedMs);
            }

            try {
                sessionStorage.setItem('realizeme:sketchImage', sketchImage);
                sessionStorage.setItem('realizeme:generatedImage', generatedImage);

                if (data.history_id != null) {
                    sessionStorage.setItem(HISTORY_ID_STORAGE_KEY, String(data.history_id));
                } else {
                    sessionStorage.removeItem(HISTORY_ID_STORAGE_KEY);
                }

                if (data.message) {
                    sessionStorage.setItem('realizeme:generateNotice', data.message);
                } else {
                    sessionStorage.removeItem('realizeme:generateNotice');
                }

                sessionStorage.setItem(RESULTS_ENTRY_WELCOME_KEY, '1');
            } catch (err) {
                sessionStorage.removeItem('realizeme:sketchImage');
                sessionStorage.removeItem('realizeme:generatedImage');
                sessionStorage.removeItem('realizeme:generateNotice');
                sessionStorage.removeItem(HISTORY_ID_STORAGE_KEY);
                sessionStorage.removeItem(RESULTS_ENTRY_WELCOME_KEY);
                if (err instanceof DOMException && err.name === 'QuotaExceededError') {
                    setGenerationError(STORAGE_QUOTA_USER_MESSAGE);
                    setStorageQuotaError(true);
                    return;
                }
                throw err;
            }

            shouldStopGenerating = false;
            router.push('/designer/results');
        } catch (error) {
            console.error('Generation failed:', error);
            setGenerationError(error instanceof Error ? error.message : 'Generation failed');
        } finally {
            if (shouldStopGenerating) {
                setIsGenerating(false);
            }
        }
    };

    const handleGenerate = async () => {
        if (!editor || isGenerating) return;

        const shapeCount = editor.getCurrentPageShapeIds().size;
        if (shapeCount === 0) {
            setCanvasToast(EMPTY_CANVAS_TOAST_MESSAGE);
            return;
        }

        if (!hasOutlineShapes(editor)) {
            setCanvasToast(NO_OUTLINE_TOAST_MESSAGE);
            return;
        }

        const sketchBlob = await exportSketchPngBlob(editor);
        if (!sketchBlob) {
            setCanvasToast(NO_OUTLINE_TOAST_MESSAGE);
            return;
        }

        const colorHintsBlob = await exportColorHintsPngBlob(editor);
        if (!colorHintsBlob) {
            setCanvasToast(EMPTY_CANVAS_TOAST_MESSAGE);
            return;
        }

        if (!hasColorHintShapes(editor)) {
            setCanvasToast(NO_COLOR_HINTS_TOAST_MESSAGE);
        }

        const previewBlob = (await exportCanvasToBlob(editor)) ?? sketchBlob;

        await startGeneration({ sketchBlob, colorHintsBlob, previewBlob });
    };

    return (
        <DrawingModeProvider>
        <GenerateFlowProvider value={generateFlowValue}>
            <div className="relative h-full w-full bg-white">
                {canvasToast && (
                    <div role="alert" className={`${TOAST_OUTER_CLASS} bottom-24`}>
                        <div className="flex items-start justify-between gap-3">
                            <p className="text-sm leading-snug text-gray-700">{canvasToast}</p>
                            <button
                                type="button"
                                onClick={() => setCanvasToast(null)}
                                className="shrink-0 text-xs font-medium text-purple-600 transition-colors hover:text-purple-800"
                                aria-label="Dismiss notification"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}
                {importToast && (
                    <div role="alert" className={`${TOAST_OUTER_CLASS} bottom-40`}>
                        <div className="flex items-start justify-between gap-3">
                            <p className="text-sm leading-snug text-gray-700">{importToast}</p>
                            <button
                                type="button"
                                onClick={() => setImportToast(null)}
                                className="shrink-0 text-xs font-medium text-purple-600 transition-colors hover:text-purple-800"
                                aria-label="Dismiss import notification"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}
                {showCanvasGuide && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10001 pointer-events-auto">
                        <div className="rounded-xl border border-purple-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
                            <p className="text-xs font-semibold text-gray-800">Quick tip</p>
                            <p className="mt-1 text-xs text-gray-600">
                                Use Outline mode for structure (black/grey), then Color hints for regions. Style panel: color, stroke, size, opacity.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    sessionStorage.setItem('realizeme:canvasGuideDismissed', '1');
                                    setShowCanvasGuide(false);
                                }}
                                className="mt-2 text-xs font-medium text-purple-600 hover:text-purple-700"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}

                <SynthesisPreviewModal
                    open={isSynthesisPreviewOpen}
                    isGenerating={isGenerating}
                    elapsedSeconds={elapsedSeconds}
                    stepLabel={currentStep}
                    isDemoMode={isDemoMode}
                    errorMessage={generationError}
                    errorIsDestructive={storageQuotaError}
                    onRetry={() => {
                        if (!pendingGeneration || isGenerating) return;
                        setStorageQuotaError(false);
                        void startGeneration(pendingGeneration);
                    }}
                    onCloseError={() => {
                        if (isGenerating) return;
                        setIsSynthesisPreviewOpen(false);
                        setGenerationError(null);
                        setStorageQuotaError(false);
                    }}
                />

                <Tldraw
                    onMount={(mountedEditor) => {
                        setEditor(mountedEditor);
                        patchDesignerImageImportLimits(mountedEditor, notifyImportRejected);
                    }}
                    hideUi
                    inferDarkMode={false}
                >
                    <CustomToolbar />
                    <CustomStylePanel />
                    <CanvasFileMenu />
                </Tldraw>

                <button
                    id="realize-btn"
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="hidden"
                >
                    Generate
                </button>
            </div>
        </GenerateFlowProvider>
        </DrawingModeProvider>
    );
}