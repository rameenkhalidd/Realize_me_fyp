'use client';

import { GeoShapeGeoStyle, useEditor, useValue } from 'tldraw';
import { useEffect, useState, type ComponentType } from 'react';
import {
    MousePointer2,
    Hand,
    Pencil,
    Eraser,
    Wand2,
    Undo2,
    Redo2,
    Trash2,
    Shapes,
    Minus,
    ChevronUp,
    Square,
    Circle,
    Triangle,
    Diamond,
    Hexagon,
    Star,
    Cloud,
    Heart,
    ImageOff,
} from 'lucide-react';

import { getTemplateShapeIds, removeTemplateShapes } from '@/lib/tldraw-utils';

import { useGenerateFlow } from './GenerateFlowContext';
import CanvasZoomBar from './CanvasZoomBar';
import ToolbarTooltip from './ToolbarTooltip';

type AllowedGeoShape =
    | 'rectangle'
    | 'ellipse'
    | 'triangle'
    | 'diamond'
    | 'hexagon'
    | 'oval'
    | 'rhombus'
    | 'star'
    | 'cloud'
    | 'heart';

const ALLOWED_SHAPES: Array<{ id: AllowedGeoShape; label: string }> = [
    { id: 'rectangle', label: 'Rectangle' },
    { id: 'ellipse', label: 'Ellipse' },
    { id: 'triangle', label: 'Triangle' },
    { id: 'diamond', label: 'Diamond' },
    { id: 'hexagon', label: 'Hexagon' },
    { id: 'oval', label: 'Oval' },
    { id: 'rhombus', label: 'Rhombus' },
    { id: 'star', label: 'Star' },
    { id: 'cloud', label: 'Cloud' },
    { id: 'heart', label: 'Heart' },
];

function ShapePreview({ shape }: { shape: AllowedGeoShape | 'line' }) {
    if (shape === 'line') {
        return <Minus size={18} />;
    }

    if (shape === 'oval') {
        return (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <ellipse cx="9" cy="9" rx="4" ry="6" stroke="currentColor" strokeWidth="1.8" />
            </svg>
        );
    }

    if (shape === 'rhombus') {
        return (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <polygon points="9,2 14,9 9,16 4,9" stroke="currentColor" strokeWidth="1.8" />
            </svg>
        );
    }

    const IconMap: Record<AllowedGeoShape, ComponentType<{ size?: number }>> = {
        rectangle: Square,
        ellipse: Circle,
        triangle: Triangle,
        diamond: Diamond,
        hexagon: Hexagon,
        oval: Circle,
        rhombus: Diamond,
        star: Star,
        cloud: Cloud,
        heart: Heart,
    };

    const Icon = IconMap[shape];
    return <Icon size={18} />;
}

export default function CustomToolbar() {
    const { isGenerating, notifyEmptyCanvas, notifyCanvasMessage } = useGenerateFlow();
    const editor = useEditor();
    const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);
    const [activeGeoShape, setActiveGeoShape] = useState<AllowedGeoShape>('rectangle');

    // Default tool = draw
    useEffect(() => {
        if (editor) editor.setCurrentTool('draw');
    }, [editor]);

    const currentToolId = useValue('current tool', () => editor?.getCurrentToolId(), [editor]);

    const canUndo = useValue('can undo', () => (editor ? editor.getCanUndo() : false), [editor]);
    const canRedo = useValue('can redo', () => (editor ? editor.getCanRedo() : false), [editor]);
    const hasSelection = useValue(
        'has selection',
        () => (editor?.getSelectedShapeIds().length ?? 0) > 0,
        [editor]
    );
    const hasCanvasShapes = useValue(
        'has canvas shapes',
        () => ((editor ? Array.from(editor.getCurrentPageShapeIds()).length : 0) > 0),
        [editor]
    );
    const hasTemplateShapes = useValue(
        'has template shapes',
        () => (editor ? getTemplateShapeIds(editor).length > 0 : false),
        [editor]
    );

    if (!editor) return null;

    const generateInactive = !hasCanvasShapes || isGenerating;
    const generateTitle = !hasCanvasShapes
        ? 'Draw on canvas first, then generate'
        : isGenerating
            ? 'Generation in progress — please wait'
            : 'Generate from your full sketch (all shapes on canvas, not just the visible area)';

    const tools = [
        { id: 'select', icon: MousePointer2, label: 'Select' },
        { id: 'hand', icon: Hand, label: 'Hand' },
        { id: 'draw', icon: Pencil, label: 'Draw' },
        { id: 'eraser', icon: Eraser, label: 'Eraser' },
    ];

    const handleDeleteSelected = () => {
        const selectedIds = editor.getSelectedShapeIds();
        if (selectedIds.length > 0) {
            editor.deleteShapes(selectedIds);
        }
    };

    const handleRemoveTemplate = () => {
        if (removeTemplateShapes(editor)) {
            notifyCanvasMessage('Template removed. Press Ctrl+Z to bring it back.');
        }
    };

    const handleGeoShapeSelect = (shape: AllowedGeoShape) => {
        setActiveGeoShape(shape);
        editor.run(() => {
            editor.setStyleForNextShapes(GeoShapeGeoStyle, shape);
            editor.setCurrentTool('geo');
        });
        setIsShapeMenuOpen(false);
    };

    const handleLineToolSelect = () => {
        editor.setCurrentTool('line');
        setIsShapeMenuOpen(false);
    };
    const activeShapeLabel = currentToolId === 'line'
        ? 'Line'
        : (ALLOWED_SHAPES.find((shape) => shape.id === activeGeoShape)?.label ?? 'Shape');

    const activeBtn =
        'bg-realize-gradient-fuchsia text-slate-900 shadow-realize-xl scale-[1.07] border border-violet-200/70 transition-all duration-300';

    const inactiveBtn =
        'bg-white text-gray-600 hover:bg-gray-50 border border-realize hover:text-realize shadow-sm transition-all duration-200';

    const disabledBtn = 'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-600';

    const removeGuideBtn =
        'bg-violet-50 text-violet-700 border border-violet-200/80 shadow-sm hover:bg-violet-100 hover:text-violet-800 hover:border-violet-300/90 active:bg-violet-100/90 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2';

    return (
        <div
            className="
                absolute bottom-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto
                flex flex-nowrap items-center gap-3 px-5 py-3
                rounded-2xl border-realize shadow-realize-xl
                bg-white/80 backdrop-blur-2xl
            "
        >
            {/* === Tool Buttons === */}
            {tools.map((tool) => {
                const Icon = tool.icon;
                const isActive = currentToolId === tool.id;

                return (
                    <button
                        key={tool.id}
                        onClick={() => editor.setCurrentTool(tool.id)}
                        className={`p-3 rounded-xl shrink-0 ${isActive ? activeBtn : inactiveBtn}`}
                        title={`Switch to ${tool.label} tool`}
                    >
                        <Icon size={20} />
                    </button>
                );
            })}

            {/* === Allowed Shapes Menu === */}
            <div className="relative">
                {isShapeMenuOpen && (
                    <div className="absolute bottom-[calc(100%+10px)] left-0 z-[10000] w-48 rounded-xl border border-realize bg-white shadow-realize-xl p-2">
                        <div className="grid grid-cols-4 gap-1">
                            {ALLOWED_SHAPES.map((shape) => (
                                <button
                                    key={shape.id}
                                    onClick={() => handleGeoShapeSelect(shape.id)}
                                    className={`h-9 w-9 flex items-center justify-center rounded-lg ${currentToolId === 'geo' && activeGeoShape === shape.id ? activeBtn : inactiveBtn}`}
                                    title={`Use ${shape.label} shape`}
                                >
                                    <ShapePreview shape={shape.id} />
                                </button>
                            ))}
                            <button
                                onClick={handleLineToolSelect}
                                className={`h-9 w-9 flex items-center justify-center rounded-lg ${currentToolId === 'line' ? activeBtn : inactiveBtn}`}
                                title="Use Line shape"
                            >
                                <ShapePreview shape="line" />
                            </button>
                        </div>
                    </div>
                )}

                <button
                    onClick={() => setIsShapeMenuOpen((open) => !open)}
                    className={`shrink-0 p-3 rounded-xl ${currentToolId === 'geo' || currentToolId === 'line' ? activeBtn : inactiveBtn}`}
                    title="Choose shape tool"
                >
                    <div className="flex items-center gap-1">
                        <Shapes size={18} />
                        <span className="text-xs font-medium">{activeShapeLabel}</span>
                        {currentToolId === 'line' ? <Minus size={16} /> : <ChevronUp size={14} className={`${isShapeMenuOpen ? 'rotate-180' : ''} transition-transform`} />}
                    </div>
                </button>
            </div>

            {/* Divider */}
            <div className="w-[1px] h-8 bg-realize mx-2 shrink-0" />

            {/* === History / Delete Actions === */}
            <button
                onClick={() => editor.undo()}
                disabled={!canUndo}
                className={`shrink-0 p-3 rounded-xl ${inactiveBtn} ${disabledBtn}`}
                title="Undo last action (Ctrl/Cmd+Z)"
            >
                <Undo2 size={20} />
            </button>

            <button
                onClick={() => editor.redo()}
                disabled={!canRedo}
                className={`shrink-0 p-3 rounded-xl ${inactiveBtn} ${disabledBtn}`}
                title="Redo last action (Ctrl+Y, Ctrl+Shift+Z, or Cmd+Shift+Z)"
            >
                <Redo2 size={20} />
            </button>

            <button
                onClick={handleDeleteSelected}
                disabled={!hasSelection}
                className={`shrink-0 p-3 rounded-xl ${inactiveBtn} ${disabledBtn}`}
                title="Delete selected shapes"
            >
                <Trash2 size={20} />
            </button>

            {hasTemplateShapes && (
                <ToolbarTooltip
                    label="Remove template"
                    detail="Removes the tracing guide"
                    detailLine2="Keeps your strokes"
                >
                    <button
                        type="button"
                        onClick={handleRemoveTemplate}
                        className={`p-3 rounded-xl ${removeGuideBtn}`}
                        aria-label="Remove template — removes the tracing guide, keeps your strokes"
                    >
                        <ImageOff size={20} />
                    </button>
                </ToolbarTooltip>
            )}

            <div className="w-[1px] h-8 bg-realize mx-2 shrink-0" />

            <CanvasZoomBar inactiveBtnClass={inactiveBtn} disabledBtnClass={disabledBtn} />

            {/* === Generate Button === */}
            <button
                type="button"
                onClick={() => {
                    if (isGenerating) return;
                    if (!hasCanvasShapes) {
                        notifyEmptyCanvas();
                        return;
                    }
                    document.getElementById('realize-btn')?.click();
                }}
                title={generateTitle}
                aria-disabled={generateInactive}
                className={`
                    relative shrink-0 px-7 py-3 rounded-xl font-raleway font-bold text-slate-900
                    bg-realize-gradient-fuchsia border border-violet-200/70
                    shadow-realize-xl overflow-hidden flex items-center gap-2
                    transition-all duration-200
                    ${generateInactive
                        ? 'cursor-not-allowed opacity-55 brightness-95 saturate-90 hover:scale-100'
                        : 'opacity-100 hover:scale-[1.02] active:scale-[0.99]'}
                `}
            >
                <div
                    className="
                    absolute inset-0
                    bg-realize-gradient-fuchsia
                    blur-xl opacity-15 -z-10
                "
                />
                <Wand2 size={20} />
                Generate
            </button>
        </div>
    );
}