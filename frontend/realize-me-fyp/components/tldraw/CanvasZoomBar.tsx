'use client';

import { Maximize2, Minus, Plus } from 'lucide-react';
import { useEditor, useValue } from 'tldraw';

import { fitCameraToSketch, formatZoomPercent } from '@/lib/tldraw-utils';

type CanvasZoomBarProps = {
    inactiveBtnClass: string;
    disabledBtnClass: string;
};

export default function CanvasZoomBar({ inactiveBtnClass, disabledBtnClass }: CanvasZoomBarProps) {
    const editor = useEditor();

    const zoomLabel = useValue('zoom percent', () => (editor ? formatZoomPercent(editor) : '100%'), [editor]);
    const hasShapes = useValue(
        'has shapes for fit',
        () => (editor ? editor.getCurrentPageShapeIds().size > 0 : false),
        [editor]
    );

    if (!editor) return null;

    const btnClass = `shrink-0 p-3 rounded-xl ${inactiveBtnClass}`;

    return (
        <div className="flex shrink-0 items-center gap-1">
            <button
                type="button"
                onClick={() => editor.zoomOut()}
                className={btnClass}
                title="Zoom out"
                aria-label="Zoom out"
            >
                <Minus size={20} aria-hidden />
            </button>
            <button
                type="button"
                onClick={() => {
                    if (!hasShapes) return;
                    fitCameraToSketch(editor, { animate: true });
                }}
                disabled={!hasShapes}
                className={`min-w-[3.25rem] px-2 py-3 rounded-xl text-xs font-semibold tabular-nums text-gray-800 ${inactiveBtnClass} ${disabledBtnClass}`}
                title={hasShapes ? 'Fit whole sketch in view' : 'Draw something to fit view'}
                aria-label="Fit whole sketch in view"
            >
                {zoomLabel}
            </button>
            <button
                type="button"
                onClick={() => editor.zoomIn()}
                className={btnClass}
                title="Zoom in"
                aria-label="Zoom in"
            >
                <Plus size={20} aria-hidden />
            </button>
            <button
                type="button"
                onClick={() => fitCameraToSketch(editor, { animate: true })}
                disabled={!hasShapes}
                className={`${btnClass} ${disabledBtnClass}`}
                title="Fit to sketch"
                aria-label="Fit to sketch"
            >
                <Maximize2 size={20} aria-hidden />
            </button>
        </div>
    );
}
