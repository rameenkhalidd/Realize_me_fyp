'use client';

import { createContext, useContext, type ReactNode } from 'react';

export type GenerateFlowContextValue = {
    isGenerating: boolean;
    notifyEmptyCanvas: () => void;
    notifyImportRejected: (message: string) => void;
};

export const GenerateFlowContext = createContext<GenerateFlowContextValue | null>(null);

export function GenerateFlowProvider({
    children,
    value,
}: {
    children: ReactNode;
    value: GenerateFlowContextValue;
}) {
    return <GenerateFlowContext.Provider value={value}>{children}</GenerateFlowContext.Provider>;
}

export function useGenerateFlow(): GenerateFlowContextValue {
    const ctx = useContext(GenerateFlowContext);
    if (!ctx) {
        throw new Error('useGenerateFlow must be used within GenerateFlowProvider');
    }
    return ctx;
}
