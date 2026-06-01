'use client';

import { useDrawingMode } from '@/components/tldraw/DrawingModeContext';

type ModeSwitchRowProps = {
    label: string;
    checked: boolean;
    disabled?: boolean;
    onChange: (checked: boolean) => void;
};

function ModeSwitchRow({ label, checked, disabled, onChange }: ModeSwitchRowProps) {
    return (
        <div className="flex items-center justify-between gap-2">
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

type DrawingModeSwitchProps = {
    disabled?: boolean;
};

export default function DrawingModeSwitch({ disabled }: DrawingModeSwitchProps) {
    const { mode, setMode, isDesignerWorkspace } = useDrawingMode();

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
                    onChange={(on) => {
                        if (on) setMode('outline');
                    }}
                />

                <ModeSwitchRow
                    label="Color hints"
                    checked={mode === 'color-hint'}
                    disabled={disabled}
                    onChange={(on) => {
                        if (on) setMode('color-hint');
                    }}
                />
            </div>

            <p className="h-8 text-[10px] leading-snug text-gray-500">
                {mode === 'outline'
                    ? 'Draw the garment shape in black or grey.'
                    : 'Add colored strokes where you want fabric color.'}
            </p>
        </div>
    );
}
