// lib/tldraw-utils.ts
import { Box, Editor, type TLShapeId, TLStoreSnapshot, type VecLike } from 'tldraw';

import { hasColorHintShapes, hasOutlineShapes, partitionShapeIds } from '@/lib/canvas-export';

export const EXPORT_PADDING = 20;
const EXPORT_SCALE = 2;
const FIT_TO_SKETCH_INSET = 80;
/** Fixed pipeline output size (letterboxed, fit whole sketch, no crop). */
export const PIPELINE_EXPORT_SIZE = 512;

/**
 * Union bounding box of every shape on the current page (page space).
 */
export function getAllShapesPageBounds(editor: Editor): Box | null {
    const shapeIds = Array.from(editor.getCurrentPageShapeIds());
    if (shapeIds.length === 0) {
        return null;
    }

    const bounds: Box[] = [];
    for (const shapeId of shapeIds) {
        const shapeBounds = editor.getShapePageBounds(shapeId);
        if (shapeBounds) {
            bounds.push(shapeBounds);
        }
    }

    if (bounds.length === 0) {
        return null;
    }

    return Box.Common(bounds);
}

/** Bounds used for all sketch / color-hint / preview exports. */
export function getExportBounds(editor: Editor): Box | null {
    return getAllShapesPageBounds(editor);
}

/** Center for image paste/import: union of shapes, or viewport center when empty. */
export function getImagePlacementPoint(editor: Editor): VecLike {
    const bounds = getAllShapesPageBounds(editor);
    if (bounds) {
        return bounds.center;
    }
    // Empty canvas — place at the current viewport center.
    return editor.getViewportPageBounds().center;
}

/** Zoom and pan the camera to fit all page shapes. */
export function fitCameraToSketch(editor: Editor, options?: { animate?: boolean }) {
    const bounds = getAllShapesPageBounds(editor);
    if (!bounds) {
        return false;
    }

    editor.zoomToBounds(bounds, {
        inset: FIT_TO_SKETCH_INSET,
        animation: options?.animate ? { duration: 200 } : undefined,
    });
    return true;
}

const MIN_CONTAINER_PX = 50;
const MIN_BOUNDS_PX = 8;
const STABLE_BOUNDS_FRAMES = 2;
/** Fits above this usually mean shape bounds were not ready yet (e.g. right after snapshot load). */
const MAX_COMFORTABLE_FIT_ZOOM = 2.5;
const FIT_FALLBACK_DELAYS_MS = [100, 300, 600, 1000] as const;

function canFitCameraToSketch(editor: Editor): boolean {
    const container = editor.getContainer();
    if (!container) {
        return false;
    }
    if (container.clientWidth < MIN_CONTAINER_PX || container.clientHeight < MIN_CONTAINER_PX) {
        return false;
    }
    return editor.getCurrentPageShapeIds().size > 0;
}

function boundsKey(bounds: Box): string {
    return `${bounds.x.toFixed(1)},${bounds.y.toFixed(1)},${bounds.w.toFixed(1)},${bounds.h.toFixed(1)}`;
}

function hasPlausibleSketchBounds(bounds: Box): boolean {
    return bounds.w >= MIN_BOUNDS_PX && bounds.h >= MIN_BOUNDS_PX;
}

/**
 * Fit after snapshot/load once layout and shape bounds are stable.
 * Retries until zoom looks reasonable — early fits on stale bounds caused ~300%+ zoom on reload.
 */
export function scheduleFitCameraToSketch(editor: Editor, options?: { animate?: boolean }) {
    let cancelled = false;
    let lastBoundsKey: string | null = null;
    let stableFrames = 0;
    const timeoutIds: number[] = [];

    const clearTimeouts = () => {
        for (const id of timeoutIds) {
            window.clearTimeout(id);
        }
        timeoutIds.length = 0;
    };

    const applyFit = () => {
        resetCameraToDefault(editor);
        fitCameraToSketch(editor, options);
    };

    const tryFit = (relaxed = false): boolean => {
        if (cancelled || !canFitCameraToSketch(editor)) {
            return false;
        }

        const bounds = getAllShapesPageBounds(editor);
        if (!bounds || !hasPlausibleSketchBounds(bounds)) {
            lastBoundsKey = null;
            stableFrames = 0;
            return false;
        }

        const key = boundsKey(bounds);
        if (key === lastBoundsKey) {
            stableFrames += 1;
        } else {
            lastBoundsKey = key;
            stableFrames = 0;
            if (!relaxed) {
                return false;
            }
        }

        const requiredStableFrames = relaxed ? 1 : STABLE_BOUNDS_FRAMES;
        if (stableFrames < requiredStableFrames) {
            return false;
        }

        applyFit();

        return relaxed || editor.getZoomLevel() <= MAX_COMFORTABLE_FIT_ZOOM;
    };

    const waitForStableFit = (maxFrames: number) => {
        let frames = 0;
        const tick = () => {
            if (cancelled) {
                return;
            }
            if (tryFit()) {
                return;
            }
            frames += 1;
            if (frames < maxFrames) {
                requestAnimationFrame(tick);
            }
        };
        requestAnimationFrame(tick);
    };

    const container = editor.getContainer();
    let resizeObserver: ResizeObserver | undefined;
    if (container && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
            lastBoundsKey = null;
            stableFrames = 0;
            waitForStableFit(45);
        });
        resizeObserver.observe(container);
    }

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            waitForStableFit(90);
        });
    });

    for (const delayMs of FIT_FALLBACK_DELAYS_MS) {
        const relaxed = delayMs >= 600;
        timeoutIds.push(
            window.setTimeout(() => {
                if (!cancelled) {
                    tryFit(relaxed);
                }
            }, delayMs)
        );
    }

    return () => {
        cancelled = true;
        clearTimeouts();
        resizeObserver?.disconnect();
    };
}

/** Empty canvas: 100% zoom centered on the viewport. */
export function resetCameraToDefault(editor: Editor) {
    editor.resetZoom(editor.getViewportScreenCenter(), { force: true });
}

/** Remove every shape on the current page and return to 100% zoom. */
export function clearAllCanvasShapes(editor: Editor) {
    const shapeIds = Array.from(editor.getCurrentPageShapeIds());
    if (shapeIds.length > 0) {
        editor.deleteShapes(shapeIds);
    }
    resetCameraToDefault(editor);
}

/**
 * Canvas zoom policy on load/restore:
 * - 0 shapes → 100% (`resetCameraToDefault`)
 * - Has shapes → fit whole sketch (`scheduleFitCameraToSketch`), not 100%
 * Mid-session zoom is unchanged unless the canvas becomes empty or the user clicks Fit.
 */
export function restoreEditorSnapshot(editor: Editor, snapshot: TLStoreSnapshot) {
    loadEditorSnapshot(editor, snapshot);
    if (editor.getCurrentPageShapeIds().size === 0) {
        resetCameraToDefault(editor);
        return;
    }
    scheduleFitCameraToSketch(editor, { animate: false });
}

export function formatZoomPercent(editor: Editor): string {
    return `${Math.round(editor.getZoomLevel() * 100)}%`;
}

/** Set camera zoom while keeping the current pan position. */
export function setCameraZoomLevel(editor: Editor, zoom: number, options?: { animate?: boolean }) {
    const camera = editor.getCamera();
    editor.setCamera(
        { x: camera.x, y: camera.y, z: zoom },
        { animation: options?.animate ? { duration: 200 } : undefined }
    );
}

type CameraSetupCleanup = () => void;

/**
 * Match tldraw.com gesture defaults: trackpad two-finger pinch zooms, two-finger drag pans.
 * Ensures the editor stays focused so wheel/pinch events are not ignored.
 */
export function setupDesignerCamera(editor: Editor): CameraSetupCleanup {
    editor.setCameraOptions({ isLocked: false });
    editor.user.updateUserPreferences({ inputMode: 'trackpad' });
    editor.focus();

    const container = editor.getContainer();
    if (!container) {
        return () => undefined;
    }

    container.style.overscrollBehavior = 'none';

    const ensureFocused = () => {
        if (!editor.getInstanceState().isFocused) {
            editor.focus({ focusContainer: false });
        }
    };

    container.addEventListener('pointerdown', ensureFocused, { capture: true });
    container.addEventListener('pointerenter', ensureFocused);
    // Focus before tldraw's wheel handler — otherwise pinch/scroll is dropped when unfocused.
    container.addEventListener('wheel', ensureFocused, { capture: true, passive: true });

    return () => {
        container.removeEventListener('pointerdown', ensureFocused, { capture: true });
        container.removeEventListener('pointerenter', ensureFocused);
        container.removeEventListener('wheel', ensureFocused, { capture: true });
    };
}

async function exportShapeIdsToBlob(
    editor: Editor,
    shapeIds: TLShapeId[],
    bounds: Box
): Promise<Blob | null> {
    if (shapeIds.length === 0) {
        return exportWhiteCanvasBlob(bounds.width, bounds.height);
    }

    try {
        const svg = await editor.getSvgString(shapeIds, {
            bounds,
            padding: EXPORT_PADDING,
            background: true,
        });

        if (!svg) {
            throw new Error('Failed to generate SVG');
        }

        return svgToBlob(svg.svg, bounds.width, bounds.height);
    } catch (error) {
        console.error('Export error:', error);
        return null;
    }
}

/**
 * White PNG with the same dimensions as a shape export (for empty color-hint layer).
 */
export async function exportWhiteCanvasBlob(width: number, height: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
        }

        const scale = EXPORT_SCALE;
        canvas.width = width * scale;
        canvas.height = height * scale;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create blob'));
                }
            },
            'image/png',
            1.0
        );
    });
}

/**
 * Export current canvas to PNG blob using correct TLDraw v2 API (all shapes).
 */
export async function exportCanvasToBlob(editor: Editor): Promise<Blob | null> {
    const shapeIds = Array.from(editor.getCurrentPageShapeIds());

    if (shapeIds.length === 0) {
        return null;
    }

    const bounds = getExportBounds(editor);
    if (!bounds) {
        return null;
    }

    return exportShapeIdsToBlob(editor, shapeIds, bounds);
}

/** Fit a PNG inside a square canvas with white letterboxing (no crop, no stretch). */
export async function letterboxPngBlob(
    sourceBlob: Blob,
    size = PIPELINE_EXPORT_SIZE
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(sourceBlob);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                URL.revokeObjectURL(url);
                reject(new Error('Could not get canvas context'));
                return;
            }

            canvas.width = size;
            canvas.height = size;
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, size, size);

            const scale = Math.min(size / img.width, size / img.height);
            const drawWidth = img.width * scale;
            const drawHeight = img.height * scale;
            const offsetX = (size - drawWidth) / 2;
            const offsetY = (size - drawHeight) / 2;
            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

            canvas.toBlob(
                (blob) => {
                    URL.revokeObjectURL(url);
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to letterbox PNG'));
                    }
                },
                'image/png',
                1.0
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load PNG for letterbox'));
        };

        img.src = url;
    });
}

async function exportShapeIdsToPipelineBlob(
    editor: Editor,
    shapeIds: TLShapeId[],
    bounds: Box
): Promise<Blob | null> {
    const raw = await exportShapeIdsToBlob(editor, shapeIds, bounds);
    if (!raw) {
        return null;
    }
    return letterboxPngBlob(raw);
}

/**
 * Structure-only export: black/grey strokes and image imports (ControlNet input).
 * Letterboxed to PIPELINE_EXPORT_SIZE × PIPELINE_EXPORT_SIZE.
 */
export async function exportSketchPngBlob(editor: Editor): Promise<Blob | null> {
    const bounds = getExportBounds(editor);
    if (!bounds) {
        return null;
    }

    const { outlineIds } = partitionShapeIds(editor);
    if (outlineIds.length === 0) {
        return null;
    }

    return exportShapeIdsToPipelineBlob(editor, outlineIds, bounds);
}

/**
 * Color-hint export: non-black/grey strokes. Returns white letterboxed PNG when no hint shapes exist.
 */
export async function exportColorHintsPngBlob(editor: Editor): Promise<Blob | null> {
    const bounds = getExportBounds(editor);
    if (!bounds) {
        return null;
    }

    const { colorHintIds } = partitionShapeIds(editor);
    return exportShapeIdsToPipelineBlob(editor, colorHintIds, bounds);
}

/**
 * User-facing preview: all shapes (outline + color hints), letterboxed to pipeline size.
 */
export async function exportCombinedSketchPreviewBlob(editor: Editor): Promise<Blob | null> {
    const shapeIds = Array.from(editor.getCurrentPageShapeIds());
    if (shapeIds.length === 0) {
        return null;
    }

    const bounds = getExportBounds(editor);
    if (!bounds) {
        return null;
    }

    return exportShapeIdsToPipelineBlob(editor, shapeIds, bounds);
}

export { hasColorHintShapes, hasOutlineShapes };

/**
 * Convert SVG string to PNG blob
 */
async function svgToBlob(svgString: string, width: number, height: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
        }

        const scale = EXPORT_SCALE;
        canvas.width = width * scale;
        canvas.height = height * scale;

        const img = new Image();
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => {
                URL.revokeObjectURL(url);
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create blob'));
                }
            }, 'image/png', 1.0);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}

/**
 * Convert Blob to base64 data URL
 */
export function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Get snapshot of current editor state
 */
export function getEditorSnapshot(editor: Editor) {
    const snapshot = editor.store.getStoreSnapshot();
    return snapshot;
}

/**
 * Load snapshot into editor
 */
export function loadEditorSnapshot(editor: Editor, snapshot: TLStoreSnapshot) {
    try {
        editor.store.loadStoreSnapshot(snapshot);
    } catch (error) {
        console.error('Failed to load snapshot:', error);
    }
}
