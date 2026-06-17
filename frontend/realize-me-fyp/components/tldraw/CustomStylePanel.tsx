'use client';

import {
    useEditor,
    useValue,
    DefaultColorStyle,
    DefaultSizeStyle,
    DefaultDashStyle,
    type TLDefaultColorStyle,
    type TLDefaultDashStyle,
    type TLDefaultSizeStyle,
} from 'tldraw';
import { useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { CANVAS_PALETTE_COLORS, getNearestColorToken, OUTLINE_COLOR_TOKENS } from '@/lib/canvas-colors';
import DrawingModeSwitch from '@/components/tldraw/DrawingModeSwitch';
import { useDrawingMode } from '@/components/tldraw/DrawingModeContext';
import { GenerateFlowContext } from '@/components/tldraw/GenerateFlowContext';

const COLORS = CANVAS_PALETTE_COLORS;

const OUTLINE_SWATCHES = COLORS.filter((c) =>
    (OUTLINE_COLOR_TOKENS as readonly string[]).includes(c.name)
);

const COLOR_HINT_SWATCHES = COLORS.filter(
    (c) => !(OUTLINE_COLOR_TOKENS as readonly string[]).includes(c.name)
);

function normalizeSharedValue<T extends string>(
    value: T | { type: 'mixed' } | { type: 'shared'; value: T } | null | undefined
) {
    if (!value) return null;
    if (typeof value === 'object') {
        return value.type === 'shared' ? value.value : null;
    }
    return value;
}

export default function CustomStylePanel() {
    const editor = useEditor();
    const generateFlow = useContext(GenerateFlowContext);
    const isGenerating = generateFlow?.isGenerating ?? false;
    const { mode, isDesignerWorkspace } = useDrawingMode();
    const reduceMotion = useReducedMotion();
    const [customHex, setCustomHex] = useState('#ef4444');
    const [opacityPercent, setOpacityPercent] = useState(100);
    const [isOpacityDragging, setIsOpacityDragging] = useState(false);
    const lastColorHintToken = useRef<TLDefaultColorStyle>('red');
    const isOutlineMode = isDesignerWorkspace && mode === 'outline';
    const visibleSwatches = isDesignerWorkspace
        ? isOutlineMode
            ? OUTLINE_SWATCHES
            : COLOR_HINT_SWATCHES
        : COLORS;

    // 1. Force Defaults on Mount
    useEffect(() => {
        if (editor) {
            editor.setStyleForNextShapes(DefaultColorStyle, 'black');
            editor.setStyleForNextShapes(DefaultDashStyle, 'solid');
            editor.setStyleForNextShapes(DefaultSizeStyle, 's');
            editor.setOpacityForNextShapes(1);
        }
    }, [editor]);

    useEffect(() => {
        if (!editor || !isDesignerWorkspace) return;
        if (isOutlineMode) {
            setColor('black');
        } else {
            setColor(lastColorHintToken.current);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- setColor is stable per editor session
    }, [editor, isOutlineMode, isDesignerWorkspace]);

    const currentColor = useValue('current color', () => {
        if (!editor) return 'black';
        if (editor.getSelectedShapes().length > 0) {
            return normalizeSharedValue(editor.getSharedStyles().get(DefaultColorStyle));
        }
        return editor.getStyleForNextShape(DefaultColorStyle);
    }, [editor]);

    const currentDash = useValue('current dash', () => {
        if (!editor) return 'solid';
        if (editor.getSelectedShapes().length > 0) {
            return normalizeSharedValue(editor.getSharedStyles().get(DefaultDashStyle));
        }
        return editor.getStyleForNextShape(DefaultDashStyle);
    }, [editor]);

    const currentSize = useValue('current size', () => {
        if (!editor) return 's';
        if (editor.getSelectedShapes().length > 0) {
            return normalizeSharedValue(editor.getSharedStyles().get(DefaultSizeStyle));
        }
        return editor.getStyleForNextShape(DefaultSizeStyle);
    }, [editor]);

    if (!editor) return null;

    // --- Actions ---
    function setColor(color: TLDefaultColorStyle) {
        if (!isOutlineMode && !(OUTLINE_COLOR_TOKENS as readonly string[]).includes(color)) {
            lastColorHintToken.current = color;
        }
        editor.run(() => {
            editor.setStyleForNextShapes(DefaultColorStyle, color);
            const selectedShapes = editor.getSelectedShapes();
            if (selectedShapes.length > 0) {
                editor.setStyleForSelectedShapes(DefaultColorStyle, color);
            }
        });
    }

    function commitOpacity(opacityAsPercent: number) {
        const clamped = Math.min(100, Math.max(0, opacityAsPercent));
        const opValue = clamped / 100;
        editor.run(() => {
            editor.setOpacityForNextShapes(opValue);
            const selectedShapes = editor.getSelectedShapes();
            if (selectedShapes.length > 0) {
                editor.setOpacityForSelectedShapes(opValue);
            }
        });
    }

    function setDash(dash: TLDefaultDashStyle) {
        editor.run(() => {
            editor.setStyleForNextShapes(DefaultDashStyle, dash);
            const selectedShapes = editor.getSelectedShapes();
            if (selectedShapes.length > 0) {
                editor.setStyleForSelectedShapes(DefaultDashStyle, dash);
            }
        });
    }

    function setSize(size: TLDefaultSizeStyle) {
        editor.run(() => {
            editor.setStyleForNextShapes(DefaultSizeStyle, size);
            const selectedShapes = editor.getSelectedShapes();
            if (selectedShapes.length > 0) {
                editor.setStyleForSelectedShapes(DefaultSizeStyle, size);
            }
        });
    }

    function applyNearestCustomColor(hex: string) {
        const token = getNearestColorToken(hex);
        setColor(token);
    }

    // Styles
    const activeBtnClass = "bg-purple-100 border-purple-500 text-purple-700 font-bold shadow-inner";
    const inactiveBtnClass = "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300";

    return (
        <div className="absolute top-4 right-4 z-[9998] pointer-events-auto select-none">
            <div className="flex w-[200px] flex-col gap-3 rounded-2xl border border-gray-200/90 bg-white/95 p-3.5 shadow-lg backdrop-blur-sm">
                {isDesignerWorkspace ? (
                    <DrawingModeSwitch disabled={isGenerating} />
                ) : null}

                <div className="h-px bg-gray-100" aria-hidden />

                {/* Colors — fixed height so outline and color-hint modes match (no panel scroll) */}
                <div>
                    <div className="mb-1.5 text-xs font-semibold text-gray-800">Brush color</div>
                    <div className="grid h-11 grid-cols-6 content-start gap-1">
                        {visibleSwatches.map((color) => {
                            const isActive = currentColor === color.name;
                            return (
                                <button
                                    key={color.name}
                                    onClick={() => setColor(color.name)}
                                    className={`h-5 w-5 rounded-full border border-gray-200 transition-transform hover:scale-110 ${isActive ? 'ring-2 ring-purple-500 ring-offset-1 scale-110' : ''
                                        }`}
                                    style={{ backgroundColor: color.hex }}
                                    title={color.name}
                                    aria-label={`Set color ${color.name}`}
                                />
                            );
                        })}
                    </div>
                    <div className="mt-2 h-8 overflow-hidden">
                        <AnimatePresence mode="wait" initial={false}>
                            {!isOutlineMode ? (
                                <motion.label
                                    key="custom-picker"
                                    className="flex h-full cursor-pointer items-center gap-2"
                                    initial={reduceMotion ? false : { opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: reduceMotion ? 0 : 0.2 }}
                                >
                                    <input
                                        type="color"
                                        value={customHex}
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            setCustomHex(value);
                                            applyNearestCustomColor(value);
                                        }}
                                        className="h-7 w-7 shrink-0 cursor-pointer rounded-md border border-gray-200 bg-white p-0.5"
                                        title="Pick a custom color"
                                        aria-label="Pick a custom color"
                                    />
                                    <span className="text-[10px] text-gray-600">Custom picker</span>
                                </motion.label>
                            ) : null}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Stroke */}
                <div>
                    <div className="mb-2 text-xs font-semibold text-gray-800">Line style</div>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setDash('draw')}
                            className={`flex-1 py-1 text-[10px] rounded border transition-all ${currentDash === 'draw' ? activeBtnClass : inactiveBtnClass
                                }`}
                            aria-label="Set stroke style to ink"
                        >
                            Ink
                        </button>
                        <button
                            onClick={() => setDash('solid')}
                            className={`flex-1 py-1 text-[10px] rounded border transition-all ${currentDash === 'solid' ? activeBtnClass : inactiveBtnClass
                                }`}
                            aria-label="Set stroke style to liner"
                        >
                            Liner
                        </button>
                    </div>
                </div>

                {/* Size */}
                <div>
                    <div className="mb-2 text-xs font-semibold text-gray-800">Thickness</div>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setSize('s')}
                            className={`flex-1 py-1 text-[10px] rounded border transition-all ${currentSize === 's' ? activeBtnClass : inactiveBtnClass
                                }`}
                            aria-label="Set size to small"
                        >
                            Small
                        </button>
                        <button
                            onClick={() => setSize('m')}
                            className={`flex-1 py-1 text-[10px] rounded border transition-all ${currentSize === 'm' ? activeBtnClass : inactiveBtnClass
                                }`}
                            aria-label="Set size to medium"
                        >
                            Medium
                        </button>
                    </div>
                </div>

                {/* Opacity */}
                <div>
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-800">Opacity</span>
                        <span className="text-xs font-medium text-violet-700">{opacityPercent}%</span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        step={25}
                        value={opacityPercent}
                        onPointerDown={() => setIsOpacityDragging(true)}
                        onPointerUp={() => {
                            setIsOpacityDragging(false);
                            commitOpacity(opacityPercent);
                        }}
                        onChange={(event) => {
                            const nextValue = Number(event.target.value);
                            setOpacityPercent(nextValue);
                            if (!isOpacityDragging) {
                                commitOpacity(nextValue);
                            }
                        }}
                        className="w-full accent-violet-600"
                        aria-label="Brush opacity"
                    />
                </div>
            </div>
        </div>
    );
}