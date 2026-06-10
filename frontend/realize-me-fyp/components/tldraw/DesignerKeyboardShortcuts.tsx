'use client';

import { useEffect } from 'react';
import { useEditor } from 'tldraw';

function isTypingTarget(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) {
        return false;
    }
    const tag = target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        return true;
    }
    return target.isContentEditable;
}

function isModalOpen(): boolean {
    return document.querySelector('[role="dialog"][aria-modal="true"]') !== null;
}

function shouldHandleUndoRedo(editor: ReturnType<typeof useEditor>): boolean {
    if (!editor) {
        return false;
    }
    if (!editor.getInstanceState().isFocused) {
        return false;
    }
    if (editor.getEditingShapeId() !== null) {
        return false;
    }
    if (isModalOpen()) {
        return false;
    }
    return true;
}

/**
 * Registers undo/redo keyboard shortcuts when hideUi is true (tldraw's default shortcut hook is not mounted).
 */
export default function DesignerKeyboardShortcuts() {
    const editor = useEditor();

    useEffect(() => {
        if (!editor) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (isTypingTarget(event.target)) {
                return;
            }
            if (!shouldHandleUndoRedo(editor)) {
                return;
            }

            const accel = event.ctrlKey || event.metaKey;
            if (!accel) {
                return;
            }

            const key = event.key.toLowerCase();

            if (key === 'z' && !event.shiftKey) {
                if (!editor.getCanUndo()) {
                    return;
                }
                event.preventDefault();
                editor.undo();
                return;
            }

            const isRedo =
                (key === 'z' && event.shiftKey) || key === 'y';
            if (isRedo) {
                if (!editor.getCanRedo()) {
                    return;
                }
                event.preventDefault();
                editor.redo();
            }
        };

        document.addEventListener('keydown', onKeyDown, { capture: true });
        return () => {
            document.removeEventListener('keydown', onKeyDown, { capture: true });
        };
    }, [editor]);

    return null;
}
