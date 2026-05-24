/** Limits for raster/sketch image imports (Import, drag-drop, paste). */

export const MAX_CANVAS_IMPORT_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_CANVAS_IMPORT_IMAGE_DIMENSION = 4096;

const SIZE_MESSAGE = `This image is too large to import (max ${MAX_CANVAS_IMPORT_IMAGE_BYTES / (1024 * 1024)} MB). Try a smaller file.`;
const DIMENSION_MESSAGE = `This image is too large to import (max ${MAX_CANVAS_IMPORT_IMAGE_DIMENSION} px on the longest side). Try resizing it.`;
const DECODE_MESSAGE = 'Could not read this image. Try a different file format.';

async function readImageDimensions(file: File): Promise<{ w: number; h: number }> {
    try {
        const bitmap = await createImageBitmap(file);
        const w = bitmap.width;
        const h = bitmap.height;
        bitmap.close();
        return { w, h };
    } catch {
        throw new Error('decode');
    }
}

/**
 * Validates a single `image/*` file for placement on the designer canvas.
 */
export async function validateImageFileForCanvas(
    file: File
): Promise<{ ok: true } | { ok: false; message: string }> {
    if (file.size > MAX_CANVAS_IMPORT_IMAGE_BYTES) {
        return { ok: false, message: SIZE_MESSAGE };
    }

    try {
        const { w, h } = await readImageDimensions(file);
        const longest = Math.max(w, h);
        if (longest > MAX_CANVAS_IMPORT_IMAGE_DIMENSION) {
            return { ok: false, message: DIMENSION_MESSAGE };
        }
    } catch {
        return { ok: false, message: DECODE_MESSAGE };
    }

    return { ok: true };
}
