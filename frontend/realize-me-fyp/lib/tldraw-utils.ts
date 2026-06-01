// lib/tldraw-utils.ts
import { Editor, type Box, TLShapeId, TLStoreSnapshot } from 'tldraw';

import { hasColorHintShapes, hasOutlineShapes, partitionShapeIds } from '@/lib/canvas-export';

const EXPORT_PADDING = 20;
const EXPORT_SCALE = 2;

function getExportBounds(editor: Editor): Box | null {
    const shapeIds = Array.from(editor.getCurrentPageShapeIds());
    if (shapeIds.length === 0) {
        return null;
    }
    return editor.getSelectionRotatedPageBounds() ?? editor.getViewportPageBounds();
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

/**
 * Structure-only export: black/grey strokes and image imports (ControlNet input).
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

    return exportShapeIdsToBlob(editor, outlineIds, bounds);
}

/**
 * Color-hint export: non-black/grey strokes. Returns white PNG when no hint shapes exist.
 */
export async function exportColorHintsPngBlob(editor: Editor): Promise<Blob | null> {
    const bounds = getExportBounds(editor);
    if (!bounds) {
        return null;
    }

    const { colorHintIds } = partitionShapeIds(editor);
    return exportShapeIdsToBlob(editor, colorHintIds, bounds);
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
