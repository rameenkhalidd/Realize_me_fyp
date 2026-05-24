import type { ReactNode } from "react";

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
    return (
        <div
            className={`rounded-xl border border-gray-100 bg-white text-[#1F2937] shadow-sm ${className}`}
        >
            {children}
        </div>
    );
}
