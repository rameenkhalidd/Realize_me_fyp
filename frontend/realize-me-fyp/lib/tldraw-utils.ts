// lib/tldraw-utils.ts
import { Editor, TLStoreSnapshot } from 'tldraw';

/**
 * Export current canvas to PNG blob using correct TLDraw v2 API
 */
export async function exportCanvasToBlob(editor: Editor): Promise<Blob | null> {
    const shapeIds = Array.from(editor.getCurrentPageShapeIds());

    if (shapeIds.length === 0) {
        return null;
    }

    try {
        // Get the bounding box of all shapes
        const bounds = editor.getSelectionRotatedPageBounds() || editor.getViewportPageBounds();

        // Export using the correct method
        const svg = await editor.getSvgString(shapeIds, {
            bounds,
            padding: 20,
            background: true,
        });

        if (!svg) {
            throw new Error('Failed to generate SVG');
        }

        // Convert SVG to blob
        const blob = await svgToBlob(svg.svg, bounds.width, bounds.height);
        return blob;
    } catch (error) {
        console.error('Export error:', error);
        return null;
    }
}

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

        // Set canvas size (with scale for quality)
        const scale = 2;
        canvas.width = width * scale;
        canvas.height = height * scale;

        // Create image from SVG
        const img = new Image();
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            // Draw white background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw image scaled
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Convert to blob
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
    // Get the store snapshot using the correct method
    const snapshot = editor.store.getStoreSnapshot();
    return snapshot;
}

/**
 * Load snapshot into editor
 */
export function loadEditorSnapshot(editor: Editor, snapshot: TLStoreSnapshot) {
    try {
        // Load snapshot using the correct method
        editor.store.loadStoreSnapshot(snapshot);
    } catch (error) {
        console.error('Failed to load snapshot:', error);
    }
}