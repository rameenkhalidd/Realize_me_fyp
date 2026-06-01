'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type DrawingMode = 'outline' | 'color-hint';

type DrawingModeContextValue = {
    mode: DrawingMode;
    setMode: (mode: DrawingMode) => void;
    /** False on /demo where provider is omitted — full palette, no mode toggle. */
    isDesignerWorkspace: boolean;
};

const DrawingModeContext = createContext<DrawingModeContextValue | null>(null);

const MODE_STORAGE_KEY = 'realizeme:drawingMode';

function readStoredMode(): DrawingMode {
    if (typeof window === 'undefined') {
        return 'outline';
    }
    const stored = sessionStorage.getItem(MODE_STORAGE_KEY);
    return stored === 'color-hint' ? 'color-hint' : 'outline';
}

export function DrawingModeProvider({ children }: { children: ReactNode }) {
    const [mode, setModeState] = useState<DrawingMode>(readStoredMode);

    const setMode = (next: DrawingMode) => {
        setModeState(next);
        try {
            sessionStorage.setItem(MODE_STORAGE_KEY, next);
        } catch {
            // ignore quota errors
        }
    };

    const value = useMemo(
        () => ({ mode, setMode, isDesignerWorkspace: true }),
        [mode]
    );
    return <DrawingModeContext.Provider value={value}>{children}</DrawingModeContext.Provider>;
}

/** On /demo (no provider), returns outline mode with no-op setMode and full palette behavior. */
export function useDrawingMode(): DrawingModeContextValue {
    const ctx = useContext(DrawingModeContext);
    if (!ctx) {
        return {
            mode: 'outline',
            setMode: () => {},
            isDesignerWorkspace: false,
        };
    }
    return ctx;
}
