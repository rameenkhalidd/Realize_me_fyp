'use client';

import type { ReactNode } from 'react';

type ToolbarTooltipProps = {
    children: ReactNode;
    label: string;
    detail?: string;
    detailLine2?: string;
};

/**
 * Styled hover/focus tooltip for bottom toolbar controls (native `title` cannot be styled).
 */
export default function ToolbarTooltip({ children, label, detail, detailLine2 }: ToolbarTooltipProps) {
    return (
        <div className="group relative shrink-0">
            <div
                role="tooltip"
                className="
                    pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-[10001]
                    w-max max-w-[14rem] -translate-x-1/2 rounded-xl
                    border border-purple-200/90 bg-white/95 px-3 py-2 text-center font-roboto
                    shadow-md backdrop-blur-sm ring-1 ring-violet-500/10
                    opacity-0 transition-opacity duration-150
                    group-hover:opacity-100 group-focus-within:opacity-100
                "
            >
                <p className="text-xs font-semibold text-violet-800">{label}</p>
                {detail ? (
                    <p className="mt-0.5 text-[11px] leading-snug text-gray-600">{detail}</p>
                ) : null}
                {detailLine2 ? (
                    <p className="text-[11px] leading-snug text-gray-600">{detailLine2}</p>
                ) : null}
                <span
                    className="absolute left-1/2 top-full -translate-x-1/2 border-[5px] border-transparent border-t-purple-200/90"
                    aria-hidden
                />
            </div>
            {children}
        </div>
    );
}
