import type { ReactNode } from "react";

export function Badge({ className = "", children }: { className?: string; children: ReactNode }) {
    return (
        <div
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
        >
            {children}
        </div>
    );
}
