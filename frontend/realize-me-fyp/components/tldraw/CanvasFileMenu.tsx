'use client';

import { useEffect, useRef, useState } from 'react';
import { FileImage, FileType2, FolderInput, Share2 } from 'lucide-react';
import { useEditor, useValue, type TLFilesExternalContent } from 'tldraw';

import { EXPORT_PADDING, getExportBounds, getImagePlacementPoint } from '@/lib/tldraw-utils';
import ClearCanvasAction from '@/components/tldraw/ClearCanvasAction';

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function getFilenameFromUser(defaultBaseName: string, extension: 'svg' | 'png') {
    const suggested = `${defaultBaseName}.${extension}`;
    const input = window.prompt('Enter file name', suggested);

    if (!input) {
        return null;
    }

    const trimmed = input.trim();
    if (!trimmed) {
        return suggested;
    }

    if (trimmed.toLowerCase().endsWith(`.${extension}`)) {
        return trimmed;
    }

    return `${trimmed}.${extension}`;
}

async function exportSvgBlob(editor: ReturnType<typeof useEditor>, transparent: boolean) {
    const shapeIds = Array.from(editor.getCurrentPageShapeIds());
    if (shapeIds.length === 0) return null;
    const bounds = getExportBounds(editor);
    if (!bounds) return null;
    const svg = await editor.getSvgString(shapeIds, {
        bounds,
        padding: EXPORT_PADDING,
        background: !transparent,
    });
    if (!svg) return null;
    return new Blob([svg.svg], { type: 'image/svg+xml;charset=utf-8' });
}

async function exportPngBlob(editor: ReturnType<typeof useEditor>, transparent: boolean) {
    const shapeIds = Array.from(editor.getCurrentPageShapeIds());
    if (shapeIds.length === 0) return null;
    const bounds = getExportBounds(editor);
    if (!bounds) return null;
    const svg = await editor.getSvgString(shapeIds, {
        bounds,
        padding: EXPORT_PADDING,
        background: !transparent,
    });
    if (!svg) return null;

    return await new Promise<Blob | null>((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            resolve(null);
            return;
        }
        const scale = 2;
        canvas.width = Math.max(1, Math.floor(bounds.width * scale));
        canvas.height = Math.max(1, Math.floor(bounds.height * scale));
        const img = new Image();
        const svgBlob = new Blob([svg.svg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        img.onload = () => {
            if (!transparent) {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                URL.revokeObjectURL(url);
                resolve(blob);
            }, 'image/png', 1);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null);
        };
        img.src = url;
    });
}

export default function CanvasFileMenu() {
    const editor = useEditor();
    const [exportOpen, setExportOpen] = useState(false);
    const [transparent, setTransparent] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const hasCanvasShapes = useValue(
        'has canvas shapes',
        () => ((editor ? Array.from(editor.getCurrentPageShapeIds()).length : 0) > 0),
        [editor]
    );

    useEffect(() => {
        const onPointerDown = (event: MouseEvent) => {
            if (!rootRef.current) return;
            if (!rootRef.current.contains(event.target as Node)) {
                setExportOpen(false);
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setExportOpen(false);
            }
        };
        window.addEventListener('mousedown', onPointerDown);
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('mousedown', onPointerDown);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, []);

    if (!editor) return null;

    const handleUpload = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/png, image/jpeg, image/jpg, image/webp';
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            const content: TLFilesExternalContent = {
                type: 'files',
                files: [file],
                point: getImagePlacementPoint(editor),
            };
            await editor.putExternalContent(content);
        };
        input.click();
        setExportOpen(false);
    };

    const handleExportSvg = async () => {
        const blob = await exportSvgBlob(editor, transparent);
        if (!blob) {
            alert('Draw something first!');
            return;
        }
        const filename = getFilenameFromUser('canvas-export', 'svg');
        if (!filename) return;
        downloadBlob(blob, filename);
        setExportOpen(false);
    };

    const handleExportPng = async () => {
        const blob = await exportPngBlob(editor, transparent);
        if (!blob) {
            alert('Draw something first!');
            return;
        }
        const filename = getFilenameFromUser('canvas-export', 'png');
        if (!filename) return;
        downloadBlob(blob, filename);
        setExportOpen(false);
    };

    return (
        <div ref={rootRef} className="absolute top-4 left-4 z-[9999] pointer-events-auto select-none">
            <div className="relative rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-lg p-1.5">
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleUpload}
                        className="min-w-[56px] h-12 px-2 rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 transition-colors inline-flex flex-col items-center justify-center gap-0.5"
                        title="Import"
                        aria-label="Import"
                    >
                        <FolderInput size={18} aria-hidden />
                        <span className="text-[10px] font-medium leading-none">Import</span>
                    </button>
                    <button
                        onClick={() => setExportOpen((open) => !open)}
                        className={`min-w-[56px] h-12 px-2 rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 transition-colors inline-flex flex-col items-center justify-center gap-0.5 ${exportOpen ? 'ring-2 ring-purple-400 ring-offset-1' : ''}`}
                        title="Export"
                        aria-label="Export"
                    >
                        <Share2 size={18} aria-hidden />
                        <span className="text-[10px] font-medium leading-none">Export</span>
                    </button>
                    <ClearCanvasAction
                        variant="menu"
                        hasCanvasShapes={hasCanvasShapes}
                        showDraftHint
                    />
                </div>

                {exportOpen && (
                    <div className="absolute top-[calc(100%+8px)] left-0 w-52 rounded-xl border border-gray-200 bg-white shadow-xl p-1">
                        <button
                            onClick={handleExportSvg}
                            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                            <FileType2 size={16} />
                            SVG
                        </button>
                        <button
                            onClick={handleExportPng}
                            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                            <FileImage size={16} />
                            PNG
                        </button>
                        <div className="mt-1 rounded-lg px-3 py-2 text-sm text-gray-700">
                            <div className="flex items-center justify-between">
                                <span>Transparent</span>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={transparent}
                                    onClick={() => setTransparent((prev) => !prev)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${transparent ? 'bg-purple-500' : 'bg-gray-300'}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${transparent ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                                <span>Applies to PNG/SVG background</span>
                                <span className="font-medium">{transparent ? 'On' : 'Off'}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
