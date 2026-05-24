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
import { useEffect, useMemo, useState } from 'react';

const COLORS: Array<{ name: TLDefaultColorStyle; hex: string }> = [
    { name: 'black', hex: '#1d1d1d' },
    { name: 'grey', hex: '#adb5bd' },
    { name: 'light-violet', hex: '#e9d5ff' },
    { name: 'violet', hex: '#8b5cf6' },
    { name: 'blue', hex: '#3b82f6' },
    { name: 'light-blue', hex: '#0ea5e9' },
    { name: 'yellow', hex: '#fbbf24' },
    { name: 'orange', hex: '#f97316' },
    { name: 'green', hex: '#10b981' },
    { name: 'light-green', hex: '#84cc16' },
    { name: 'light-red', hex: '#fb7185' },
    { name: 'red', hex: '#ef4444' },
];

function normalizeSharedValue<T extends string>(
    value: T | { type: 'mixed' } | { type: 'shared'; value: T } | null | undefined
) {
    if (!value) return null;
    if (typeof value === 'object') {
        return value.type === 'shared' ? value.value : null;
    }
    return value;
}

function hexToRgb(hex: string) {
    const clean = hex.replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
    return {
        r: Number.parseInt(clean.slice(0, 2), 16),
        g: Number.parseInt(clean.slice(2, 4), 16),
        b: Number.parseInt(clean.slice(4, 6), 16),
    };
}

function getNearestColorToken(hex: string): TLDefaultColorStyle {
    const rgb = hexToRgb(hex);
    if (!rgb) return 'black';

    let nearest: TLDefaultColorStyle = COLORS[0].name;
    let minDistance = Number.POSITIVE_INFINITY;

    for (const color of COLORS) {
        const target = hexToRgb(color.hex);
        if (!target) continue;
        const distance =
            (rgb.r - target.r) ** 2 +
            (rgb.g - target.g) ** 2 +
            (rgb.b - target.b) ** 2;
        if (distance < minDistance) {
            minDistance = distance;
            nearest = color.name;
        }
    }

    return nearest;
}

function formatStyleValue(value: string | null | undefined, fallback = 'Mixed') {
    if (!value) return fallback;
    return value;
}

export default function CustomStylePanel() {
    const editor = useEditor();
    const [customHex, setCustomHex] = useState('#8b5cf6');
    const [opacityPercent, setOpacityPercent] = useState(100);
    const [isOpacityDragging, setIsOpacityDragging] = useState(false);

    // 1. Force Defaults on Mount
    useEffect(() => {
        if (editor) {
            editor.setStyleForNextShapes(DefaultColorStyle, 'black');
            editor.setStyleForNextShapes(DefaultDashStyle, 'solid');
            editor.setStyleForNextShapes(DefaultSizeStyle, 's');
            editor.setOpacityForNextShapes(1);
        }
    }, [editor]);

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

    const nearestToken = useMemo(() => getNearestColorToken(customHex), [customHex]);
    const styleSummary = useMemo(() => {
        return {
            color: formatStyleValue(currentColor, 'Mixed'),
            stroke: formatStyleValue(currentDash, 'Mixed'),
            size: formatStyleValue(currentSize, 'Mixed'),
            opacity: `${opacityPercent}%`,
        };
    }, [currentColor, currentDash, currentSize, opacityPercent]);

    if (!editor) return null;

    // --- Actions ---
    function setColor(color: TLDefaultColorStyle) {
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
        <div className="absolute top-4 right-4 z-[9999] pointer-events-auto select-none">
            <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white/95 backdrop-blur-sm p-3 shadow-xl w-[180px]">
                <div className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5">
                    <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Active Style</div>
                    <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-gray-600">
                        <span>Color: {styleSummary.color}</span>
                        <span>Stroke: {styleSummary.stroke}</span>
                        <span>Size: {styleSummary.size}</span>
                        <span>Opacity: {styleSummary.opacity}</span>
                    </div>
                </div>

                {/* Colors */}
                <div>
                    <div className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Color</div>
                    <div className="grid grid-cols-6 gap-1">
                        {COLORS.map((color) => {
                            const isActive = currentColor === color.name;
                            return (
                                <button
                                    key={color.name}
                                    onClick={() => setColor(color.name)}
                                    className={`w-5 h-5 rounded-full border border-gray-200 hover:scale-110 transition-transform ${isActive ? 'ring-2 ring-purple-500 ring-offset-1 scale-110' : ''
                                        }`}
                                    style={{ backgroundColor: color.hex }}
                                    title={color.name}
                                    aria-label={`Set color ${color.name}`}
                                />
                            );
                        })}
                    </div>
                    <div className="mt-2">
                        <div className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Custom Color</div>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={customHex}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    setCustomHex(value);
                                    applyNearestCustomColor(value);
                                }}
                                className="h-7 w-8 cursor-pointer rounded border border-gray-300 bg-white p-0.5"
                                title="Pick custom color"
                                aria-label="Pick custom color"
                            />
                            <input
                                type="text"
                                value={customHex}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    setCustomHex(value);
                                    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
                                        applyNearestCustomColor(value);
                                    }
                                }}
                                className="h-7 w-full rounded border border-gray-300 px-2 text-[10px] font-mono text-gray-700"
                                placeholder="#RRGGBB"
                                aria-label="Custom hex color input"
                            />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[9px] text-gray-500">
                            <span>Nearest: {nearestToken}</span>
                            <span className="inline-flex items-center gap-1">
                                <span className="inline-block h-2.5 w-2.5 rounded-full border border-gray-300" style={{ backgroundColor: customHex }} />
                                mapped
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stroke */}
                <div>
                    <div className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Stroke</div>
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
                    <div className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Size</div>
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
                    <div className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Opacity</div>
                    <div className="px-1">
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
                            className="w-full accent-purple-600"
                            aria-label="Set opacity from 0 to 100 in steps of 25"
                        />
                        <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">
                            <span>0%</span>
                            <span className="font-semibold text-gray-700">{opacityPercent}%</span>
                            <span>100%</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[9px] text-gray-400">
                            <span>0</span>
                            <span>25</span>
                            <span>50</span>
                            <span>75</span>
                            <span>100</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}