'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Editor, Tldraw, type TLShapeId, type TLStoreSnapshot } from 'tldraw';
import 'tldraw/tldraw.css';


import { useAuth } from '@/components/auth/AuthProvider';
import {
    blobToBase64,
    clearAllCanvasShapes,
    exportCombinedSketchPreviewBlob,
    exportColorHintsPngBlob,
    exportSketchPngBlob,
    setupDesignerCamera,
    getEditorSnapshot,
    getImagePlacementPoint,
    getActiveTemplateGarment,
    hasColorHintShapes,
    hasOutlineShapes,
    restoreEditorSnapshot,
    type ActiveTemplateGarment,
} from '@/lib/tldraw-utils';
import GenerateConfirmModal, {
    type GenerateCategorySelection,
} from '@/components/designer/GenerateConfirmModal';
import { findTemplateBySrcOrName } from '@/components/designer/templates';
import SynthesisPreviewModal from '@/components/designer/SynthesisPreviewModal';
import {
    DEFAULT_GARMENT_LABEL,
    DEFAULT_GENERATION_CATEGORY_ID,
} from '@/lib/generation-categories';
import {
    HISTORY_ID_STORAGE_KEY,
    RECOVER_SKETCH_STORAGE_KEY,
    RESULTS_ENTRY_WELCOME_KEY,
} from '@/lib/results-entry';
import { validateImageFileForCanvas } from '@/lib/image-import-limits';
import { patchDesignerImageImportLimits } from '@/lib/tldraw-patch-image-imports';
import { maybeDownloadPipelinePngsForDebug } from '@/lib/pipeline-debug-download';
import { getFirebaseAuth } from '@/lib/firebase/client-app';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { useDesignerDraft } from '@/components/designer/DesignerDraftContext';
import { useEmptyCanvasZoomReset } from '@/hooks/useEmptyCanvasZoomReset';

import CustomToolbar from './CustomToolbar';
import CustomStylePanel from './CustomStylePanel';
import CanvasFileMenu from './CanvasFileMenu';
import DesignerKeyboardShortcuts from './DesignerKeyboardShortcuts';
import DesignerToastStack from './DesignerToastStack';
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

const PENDING_TEMPLATE_STORAGE_KEY = 'realizeme:pendingTemplate';
const TEMPLATE_LOAD_ERROR_MESSAGE =
    "Couldn't load the template. Check your connection and try again from Templates.";

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

type GenerationPayload = {
    sketchBlob: Blob;
    colorHintsBlob: Blob;
    previewBlob: Blob;
    generationCategoryId?: string;
    garmentLabel?: string;
};

type PendingTemplate = {
    id: string;
    src: string;
    name: string;
    garmentLabel: string;
    generationCategoryId: string;
};

/** Read (without consuming) the template handoff from the Templates page; discard malformed entries. */
function readPendingTemplate(): PendingTemplate | null {
    const raw = sessionStorage.getItem(PENDING_TEMPLATE_STORAGE_KEY);
    if (!raw) {
        return null;
    }
    try {
        const parsed = JSON.parse(raw) as {
            id?: unknown;
            src?: unknown;
            name?: unknown;
            garmentLabel?: unknown;
            generationCategoryId?: unknown;
        };
        if (typeof parsed.src === 'string' && typeof parsed.name === 'string') {
            if (
                typeof parsed.id === 'string' &&
                typeof parsed.garmentLabel === 'string' &&
                typeof parsed.generationCategoryId === 'string'
            ) {
                return {
                    id: parsed.id,
                    src: parsed.src,
                    name: parsed.name,
                    garmentLabel: parsed.garmentLabel,
                    generationCategoryId: parsed.generationCategoryId,
                };
            }

            const match = findTemplateBySrcOrName(parsed.src, parsed.name);
            if (match) {
                return {
                    id: match.id,
                    src: match.src,
                    name: match.name,
                    garmentLabel: match.garmentLabel,
                    generationCategoryId: match.generationCategoryId,
                };
            }
        }
    } catch {
        // fall through — malformed entry is removed below
    }
    sessionStorage.removeItem(PENDING_TEMPLATE_STORAGE_KEY);
    return null;
}

/** Wait for shape ids that were not present before an async placement (instead of a blind timeout). */
async function waitForNewShapeIds(
    editor: Editor,
    beforeIds: ReadonlySet<TLShapeId>,
    timeoutMs = 2000
): Promise<TLShapeId[]> {
    const startedAt = Date.now();
    for (; ;) {
        const fresh = Array.from(editor.getCurrentPageShapeIds()).filter(
            (id) => !beforeIds.has(id)
        );
        if (fresh.length > 0) {
            return fresh;
        }
        if (Date.now() - startedAt >= timeoutMs || editor.isDisposed) {
            return [];
        }
        await wait(50);
    }
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
    const [pendingGeneration, setPendingGeneration] = useState<GenerationPayload | null>(null);
    const [canvasToast, setCanvasToast] = useState<string | null>(null);
    const [importToast, setImportToast] = useState<string | null>(null);
    const [draftSaveToast, setDraftSaveToast] = useState<string | null>(null);
    const [storageQuotaError, setStorageQuotaError] = useState(false);
    const [generateConfirmOpen, setGenerateConfirmOpen] = useState(false);
    const [generateConfirmPreviewUrl, setGenerateConfirmPreviewUrl] = useState<string | null>(null);
    const [generateConfirmShowDefaultColor, setGenerateConfirmShowDefaultColor] = useState(false);
    const [generateConfirmDetectedGarment, setGenerateConfirmDetectedGarment] =
        useState<ActiveTemplateGarment | null>(null);
    const router = useRouter();
    const draftRecoveredEditorRef = useRef<Editor | null>(null);
    const cameraCleanupRef = useRef<(() => void) | null>(null);
    const generateConfirmPendingRef = useRef<GenerationPayload | null>(null);
    const {
        registerEditor,
        setGenerateActive,
        status: draftSaveStatus,
        saveErrorMessage,
        clearSaveError,
        saveDraft,
    } = useDesignerDraft();

    useEffect(() => {
        registerEditor(editor);
        return () => registerEditor(null);
    }, [editor, registerEditor]);

    useEffect(() => {
        if (!editor) return;
        cameraCleanupRef.current?.();
        cameraCleanupRef.current = setupDesignerCamera(editor);
        return () => {
            cameraCleanupRef.current?.();
            cameraCleanupRef.current = null;
        };
    }, [editor]);

    useEmptyCanvasZoomReset(editor);

    useEffect(() => {
        setGenerateActive(isGenerating);
    }, [isGenerating, setGenerateActive]);

    const notifyEmptyCanvas = useCallback(() => {
        setCanvasToast(EMPTY_CANVAS_TOAST_MESSAGE);
    }, []);

    const notifyImportRejected = useCallback((message: string) => {
        setImportToast(message);
    }, []);

    const notifyCanvasMessage = useCallback((message: string) => {
        setCanvasToast(message);
    }, []);

    const generateFlowValue = useMemo(
        () => ({ isGenerating, notifyEmptyCanvas, notifyImportRejected, notifyCanvasMessage }),
        [isGenerating, notifyEmptyCanvas, notifyImportRejected, notifyCanvasMessage]
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

    useEffect(() => {
        if (draftSaveStatus === 'error' && saveErrorMessage) {
            setDraftSaveToast(saveErrorMessage);
        }
    }, [draftSaveStatus, saveErrorMessage]);

    useEffect(() => {
        if (!draftSaveToast) return;
        const id = window.setTimeout(() => {
            setDraftSaveToast(null);
            clearSaveError();
        }, 8000);
        return () => window.clearTimeout(id);
    }, [draftSaveToast, clearSaveError]);

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

            await editor.putExternalContent({
                type: 'files',
                files: imageFiles,
                point: getImagePlacementPoint(editor),
            });
        };

        doc.addEventListener('paste', onPaste, { capture: true });
        return () => doc.removeEventListener('paste', onPaste, { capture: true });
    }, [editor, notifyImportRejected]);

    /**
     * Canvas bootstrap, once per editor instance, in strict order:
     * 1. A pending template from the Templates page WINS — fresh canvas, draft recovery skipped
     *    entirely (Option C: the old draft is replaced by the next autosave).
     * 2. Otherwise recover the sketch from a history handoff or the latest server draft.
     */
    useEffect(() => {
        if (!editor || draftRecoveredEditorRef.current === editor) {
            return;
        }

        const pendingTemplate = readPendingTemplate();

        if (pendingTemplate) {
            draftRecoveredEditorRef.current = editor;
            // Template wins: drop any stale history handoff so it can't restore on a later visit.
            sessionStorage.removeItem(RECOVER_SKETCH_STORAGE_KEY);

            const { src, name, id, garmentLabel, generationCategoryId } = pendingTemplate;
            void (async () => {
                try {
                    const response = await fetch(src);
                    if (!response.ok) {
                        throw new Error(`Template fetch failed (${response.status})`);
                    }
                    const blob = await response.blob();
                    const file = new File([blob], `${name}.png`, {
                        type: blob.type || 'image/png',
                    });

                    // Fresh canvas at 100% zoom, then place the template at the viewport center.
                    clearAllCanvasShapes(editor);

                    const beforeIds = new Set<TLShapeId>(editor.getCurrentPageShapeIds());
                    await editor.putExternalContent({
                        type: 'files',
                        files: [file],
                        point: getImagePlacementPoint(editor),
                    });

                    const templateIds = await waitForNewShapeIds(editor, beforeIds);
                    if (templateIds.length === 0) {
                        throw new Error('Template shape was not created');
                    }

                    // Lock + tag so "New sketch" and the Remove template button can find it reliably.
                    // History-ignored so a single Ctrl+Z removes the template itself.
                    editor.run(
                        () => {
                            editor.updateShapes(
                                templateIds.map((shapeId) => {
                                    const shape = editor.getShape(shapeId);
                                    return {
                                        id: shapeId,
                                        type: shape?.type ?? 'image',
                                        isLocked: true,
                                        meta: {
                                            ...shape?.meta,
                                            isTemplate: true,
                                            templateId: id,
                                            templateName: name,
                                            garmentLabel,
                                            generationCategoryId,
                                        },
                                    };
                                })
                            );
                        },
                        { history: 'ignore' }
                    );

                    sessionStorage.removeItem(PENDING_TEMPLATE_STORAGE_KEY);
                    setCanvasToast(
                        `"${name}" added template. Use as it is or draw over it in Outline mode.`
                    );
                } catch (err) {
                    console.error('Failed to place template on canvas:', err);
                    if (editor.isDisposed) {
                        // Editor remounted mid-flight (e.g. React StrictMode): keep the
                        // sessionStorage key so the next editor instance retries placement.
                        if (draftRecoveredEditorRef.current === editor) {
                            draftRecoveredEditorRef.current = null;
                        }
                        return;
                    }
                    sessionStorage.removeItem(PENDING_TEMPLATE_STORAGE_KEY);
                    setCanvasToast(TEMPLATE_LOAD_ERROR_MESSAGE);
                }
            })();
            return;
        }

        // --- No pending template: recover sketch from history handoff or latest server draft. ---
        if (!isFirebaseConfigured()) {
            return;
        }

        const recoverRaw = sessionStorage.getItem(RECOVER_SKETCH_STORAGE_KEY);
        if (recoverRaw) {
            try {
                const sketch = JSON.parse(recoverRaw) as TLStoreSnapshot;
                restoreEditorSnapshot(editor, sketch);
                sessionStorage.removeItem(RECOVER_SKETCH_STORAGE_KEY);
                draftRecoveredEditorRef.current = editor;
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
                    draftRecoveredEditorRef.current = editor;
                    return;
                }
                restoreEditorSnapshot(editor, sketch as TLStoreSnapshot);
                draftRecoveredEditorRef.current = editor;
            } catch (e) {
                console.error('Draft recovery failed:', e);
                draftRecoveredEditorRef.current = editor;
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

    const startGeneration = async (payload: GenerationPayload) => {
        const { sketchBlob, colorHintsBlob, previewBlob } = payload;
        const generationCategoryId =
            payload.generationCategoryId ?? DEFAULT_GENERATION_CATEGORY_ID;
        const garmentLabel = payload.garmentLabel ?? DEFAULT_GARMENT_LABEL;
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
                formData.append('sketch', sketchBlob, 'sketch.png');           
                formData.append('color_hints', colorHintsBlob, 'color_hints.png'); 
                formData.append('preview_file', previewBlob, 'preview.png');
                formData.append('generation_category_id', generationCategoryId);
                formData.append('garment_label', garmentLabel);
                if (editor) {
                    formData.append('sketch_json', JSON.stringify(getEditorSnapshot(editor)));
                }

                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
                const endpoint = backendUrl
                    ? `${backendUrl}/generate-image`
                    : '/api/generate';

                const response = await fetch(endpoint, {
                    method: 'POST',
                    ...(backendUrl ? {} : { headers: { Authorization: `Bearer ${idToken}` } }),
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

    const closeGenerateConfirm = useCallback(() => {
        setGenerateConfirmOpen(false);
        setGenerateConfirmShowDefaultColor(false);
        setGenerateConfirmDetectedGarment(null);
        setGenerateConfirmPreviewUrl((prev) => {
            if (prev) {
                URL.revokeObjectURL(prev);
            }
            return null;
        });
        generateConfirmPendingRef.current = null;
    }, []);

    const handleGenerateConfirmContinue = useCallback(
        async (category: GenerateCategorySelection) => {
            const pending = generateConfirmPendingRef.current;
            if (!pending) {
                return;
            }
            generateConfirmPendingRef.current = null;
            setGenerateConfirmOpen(false);
            setGenerateConfirmShowDefaultColor(false);
            setGenerateConfirmDetectedGarment(null);
            setGenerateConfirmPreviewUrl((prev) => {
                if (prev) {
                    URL.revokeObjectURL(prev);
                }
                return null;
            });
            maybeDownloadPipelinePngsForDebug(pending.sketchBlob, pending.colorHintsBlob);
            await startGeneration({
                ...pending,
                generationCategoryId: category.generationCategoryId,
                garmentLabel: category.garmentLabel,
            });
        },
        []
    );

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

        const hasColorHints = hasColorHintShapes(editor);
        if (!hasColorHints && !user) {
            setCanvasToast(NO_COLOR_HINTS_TOAST_MESSAGE);
        }

        const previewBlob = (await exportCombinedSketchPreviewBlob(editor)) ?? sketchBlob;

        const payload: GenerationPayload = {
            sketchBlob,
            colorHintsBlob,
            previewBlob,
        };

        if (user) {
            generateConfirmPendingRef.current = payload;
            setGenerateConfirmDetectedGarment(getActiveTemplateGarment(editor));
            setGenerateConfirmShowDefaultColor(!hasColorHints);
            setGenerateConfirmPreviewUrl(URL.createObjectURL(previewBlob));
            setGenerateConfirmOpen(true);
            return;
        }

        maybeDownloadPipelinePngsForDebug(sketchBlob, colorHintsBlob);
        await startGeneration(payload);
    };

    return (
        <DrawingModeProvider>
            <GenerateFlowProvider value={generateFlowValue}>
                <div className="relative h-full w-full bg-white">
                    <DesignerToastStack
                        canvasToast={canvasToast}
                        onDismissCanvasToast={() => setCanvasToast(null)}
                        importToast={importToast}
                        onDismissImportToast={() => setImportToast(null)}
                        draftSaveToast={draftSaveToast}
                        onRetryDraftSave={() => void saveDraft()}
                        onDismissDraftSaveToast={() => {
                            setDraftSaveToast(null);
                            clearSaveError();
                        }}
                    />
                    {showCanvasGuide && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10001 pointer-events-auto">
                            <div className="rounded-xl border border-purple-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
                                <p className="text-xs font-semibold text-gray-800">Quick tip</p>
                                <p className="mt-1 text-xs text-gray-600">
                                    Use Outline mode for structure (black/grey), then Color hints for regions. Pinch or scroll on the canvas to zoom — Generate always exports your entire sketch.
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

                    <GenerateConfirmModal
                        open={generateConfirmOpen}
                        previewUrl={generateConfirmPreviewUrl}
                        showDefaultColorNote={generateConfirmShowDefaultColor}
                        detectedGarment={generateConfirmDetectedGarment}
                        onBack={closeGenerateConfirm}
                        onContinue={(category) => {
                            void handleGenerateConfirmContinue(category);
                        }}
                    />

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
                        <DesignerKeyboardShortcuts />
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