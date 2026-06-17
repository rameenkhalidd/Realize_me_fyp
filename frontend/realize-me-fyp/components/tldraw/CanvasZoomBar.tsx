'use client';

import { Maximize2, Minus, Plus } from 'lucide-react';
import { useEditor, useValue } from 'tldraw';

import { fitCameraToSketch, formatZoomPercent, resetCameraToDefault } from '@/lib/tldraw-utils';

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
                onClick={() => resetCameraToDefault(editor)}
                className="min-w-[3.25rem] shrink-0 rounded-xl border border-gray-300 bg-white px-2.5 py-3 text-xs font-semibold tabular-nums shadow-sm hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                title="Reset zoom to 100%"
                aria-label={`Zoom level ${zoomLabel}. Reset to 100%`}
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
                title="Fit whole sketch in view — recenters and frames your drawing"
                aria-label="Fit whole sketch in view — recenters and frames your drawing"
            >
                <Maximize2 size={20} aria-hidden />
            </button>
        </div>
    );
}
