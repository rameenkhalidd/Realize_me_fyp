'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { useDrawingMode, type DrawingMode } from '@/components/tldraw/DrawingModeContext';

type ModeSwitchRowProps = {
    label: string;
    checked: boolean;
    disabled?: boolean;
    flash?: boolean;
    onChange: (checked: boolean) => void;
};

function ModeSwitchRow({ label, checked, disabled, flash, onChange }: ModeSwitchRowProps) {
    return (
        <div
            className={`-mx-1 flex items-center justify-between gap-2 rounded-md px-1 transition-colors duration-300 ${
                flash ? 'bg-violet-50 ring-1 ring-violet-200/80' : ''
            }`}
        >
            <span className="text-xs font-medium text-gray-800">{label}</span>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={`relative h-6 w-10 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 disabled:cursor-not-allowed disabled:opacity-50 ${
                    checked ? 'bg-violet-500' : 'bg-gray-200'
                }`}
            >
                <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        checked ? 'translate-x-4' : 'translate-x-0'
                    }`}
                />
            </button>
        </div>
    );
}

const HELPER_COPY: Record<DrawingMode, string> = {
    outline: 'Draw the garment shape in black or grey.',
    'color-hint': 'Add colored strokes where you want fabric color.',
};

type DrawingModeSwitchProps = {
    disabled?: boolean;
};

export default function DrawingModeSwitch({ disabled }: DrawingModeSwitchProps) {
    const { mode, setMode, isDesignerWorkspace } = useDrawingMode();
    const reduceMotion = useReducedMotion();
    const prevModeRef = useRef<DrawingMode | null>(null);
    const [flashMode, setFlashMode] = useState<DrawingMode | null>(null);

    useEffect(() => {
        if (prevModeRef.current === mode) {
            return;
        }

        const previousMode = prevModeRef.current;
        prevModeRef.current = mode;

        if (previousMode === null || reduceMotion) {
            return;
        }

        setFlashMode(mode);
        const id = window.setTimeout(() => setFlashMode(null), 300);
        return () => window.clearTimeout(id);
        // reduceMotion read intentionally without dep — flash only on mode change, not hydration
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    if (!isDesignerWorkspace) {
        return null;
    }

    return (
        <div className="flex min-h-[6.75rem] flex-col justify-between gap-2">
            <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-gray-800">Drawing step</span>
                    <span className="text-[10px] text-gray-500">{mode === 'outline' ? '1 of 2' : '2 of 2'}</span>
                </div>

                <ModeSwitchRow
                    label="Outline"
                    checked={mode === 'outline'}
                    disabled={disabled}
                    flash={flashMode === 'outline'}
                    onChange={(on) => {
                        if (on) setMode('outline');
                    }}
                />

                <ModeSwitchRow
                    label="Color hints"
                    checked={mode === 'color-hint'}
                    disabled={disabled}
                    flash={flashMode === 'color-hint'}
                    onChange={(on) => {
                        if (on) setMode('color-hint');
                    }}
                />
            </div>

            <div className="h-8 overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.p
                        key={mode}
                        className="text-[10px] leading-snug text-gray-500"
                        initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                        transition={{ duration: reduceMotion ? 0 : 0.2 }}
                    >
                        {HELPER_COPY[mode]}
                    </motion.p>
                </AnimatePresence>
            </div>
        </div>
    );
}
