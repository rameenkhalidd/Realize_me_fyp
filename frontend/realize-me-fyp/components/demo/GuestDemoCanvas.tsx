'use client';

import { useCallback, useEffect, useState } from 'react';
import { Editor, Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';

import { validateImageFileForCanvas } from '@/lib/image-import-limits';
import { patchDesignerImageImportLimits } from '@/lib/tldraw-patch-image-imports';

import CanvasFileMenu from '@/components/tldraw/CanvasFileMenu';
import CustomStylePanel from '@/components/tldraw/CustomStylePanel';
import GuestDemoToolbar from '@/components/demo/GuestDemoToolbar';

const TOAST_OUTER_CLASS =
    'fixed left-1/2 z-10050 w-[min(calc(100vw-2rem),24rem)] -translate-x-1/2 rounded-xl border border-purple-200/90 bg-white/95 px-4 py-3 font-roboto shadow-md backdrop-blur-sm ring-1 ring-violet-500/10 transition-opacity duration-200';

export default function GuestDemoCanvas() {
    const [importToast, setImportToast] = useState<string | null>(null);

    const notifyImportRejected = useCallback((message: string) => {
        setImportToast(message);
    }, []);

    useEffect(() => {
        if (!importToast) return;
        const id = window.setTimeout(() => setImportToast(null), 5000);
        return () => window.clearTimeout(id);
    }, [importToast]);

    /** Image paste guard (same behavior as designer; hideUi skips tldraw clipboard handlers). */
    const bindPasteGuard = useCallback(
        (editor: Editor) => {
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
        },
        [notifyImportRejected]
    );

    const [editor, setEditor] = useState<Editor | null>(null);

    useEffect(() => {
        if (!editor) return;
        return bindPasteGuard(editor);
    }, [editor, bindPasteGuard]);

    return (
        <div className="relative h-full w-full bg-white">
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

            <Tldraw
                onMount={(mountedEditor) => {
                    setEditor(mountedEditor);
                    patchDesignerImageImportLimits(mountedEditor, notifyImportRejected);
                }}
                hideUi
                inferDarkMode={false}
            >
                <GuestDemoToolbar />
                <CustomStylePanel />
                <CanvasFileMenu />
            </Tldraw>
        </div>
    );
}
