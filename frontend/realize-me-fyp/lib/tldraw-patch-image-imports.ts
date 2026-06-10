import type { Editor } from 'tldraw';

import { validateImageFileForCanvas } from '@/lib/image-import-limits';
import { getImagePlacementPoint } from '@/lib/tldraw-utils';

type EditorWithExternalHandlers = Editor & {
    externalContentHandlers: Record<string, ((info: unknown) => unknown | Promise<unknown>) | null>;
};

/** Runs after tldraw registers default handlers (see Tldraw `useOnMount` order). */
export function patchDesignerImageImportLimits(editor: Editor, notifyImportRejected: (message: string) => void) {
    const handlers = (editor as EditorWithExternalHandlers).externalContentHandlers;
    const prevFiles = handlers.files;
    if (prevFiles) {
        editor.registerExternalContentHandler('files', async (info) => {
            const payload = info as { files: File[]; point?: { x: number; y: number } };
            const files = payload.files;
            for (const file of files) {
                if (file.type.startsWith('image/')) {
                    const result = await validateImageFileForCanvas(file);
                    if (!result.ok) {
                        notifyImportRejected(result.message);
                        return;
                    }
                }
            }
            return prevFiles({
                ...payload,
                point: payload.point ?? getImagePlacementPoint(editor),
            });
        });
    }
    const prevReplace = handlers['file-replace'];
    if (prevReplace) {
        editor.registerExternalContentHandler('file-replace', async (info) => {
            const { file, isImage } = info as { file: File; isImage: boolean };
            if (isImage) {
                const result = await validateImageFileForCanvas(file);
                if (!result.ok) {
                    notifyImportRejected(result.message);
                    return;
                }
            }
            return prevReplace(info);
        });
    }
}
