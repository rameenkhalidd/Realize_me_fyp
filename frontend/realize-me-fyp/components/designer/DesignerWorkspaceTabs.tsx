'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { History, SquarePen } from 'lucide-react';

/**
 * Primary navigation between the live canvas and saved generations (history).
 */
export function DesignerWorkspaceTabs() {
    const pathname = usePathname();
    const onHistory = pathname.startsWith('/designer/history');

    const tabCls = (active: boolean) =>
        `inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            active
                ? 'bg-white text-violet-800 shadow-sm ring-1 ring-violet-200/80'
                : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
        }`;

    return (
        <nav
            className="inline-flex gap-1 rounded-xl bg-slate-100/90 p-1 ring-1 ring-slate-200/80"
            aria-label="Workspace sections"
        >
            <Link
                href="/designer"
                className={tabCls(!onHistory)}
                scroll={false}
                title="Draw garment sketches and run AI generation"
            >
                <SquarePen className="h-4 w-4 shrink-0" aria-hidden />
                Design
            </Link>
            <Link
                href="/designer/history"
                className={tabCls(onHistory)}
                scroll={false}
                title="View past generations and reopen saved sketches"
            >
                <History className="h-4 w-4 shrink-0" aria-hidden />
                My work
            </Link>
        </nav>
    );
}
