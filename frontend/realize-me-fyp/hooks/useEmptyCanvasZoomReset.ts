'use client';

import { useEffect } from 'react';
import type { Editor } from 'tldraw';

import { resetCameraToDefault } from '@/lib/tldraw-utils';

/**
 * When the user removes the last shape (eraser, delete, undo, clear, etc.),
 * snap the view back to 100% so an empty canvas always feels the same.
 */
export function useEmptyCanvasZoomReset(editor: Editor | null) {
    useEffect(() => {
        if (!editor) {
            return;
        }

        let prevShapeCount = editor.getCurrentPageShapeIds().size;

        const removeListener = editor.store.listen(
            () => {
                const shapeCount = editor.getCurrentPageShapeIds().size;
                if (prevShapeCount > 0 && shapeCount === 0) {
                    resetCameraToDefault(editor);
                }
                prevShapeCount = shapeCount;
            },
            { source: 'user', scope: 'document' }
        );

        return () => {
            removeListener();
        };
    }, [editor]);
}
