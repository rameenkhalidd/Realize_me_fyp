'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { INTERACTIVE_BUTTON_MOTION } from '@/lib/interactive-button-motion';

/** Primary exit from results back to the live design canvas (designer header). */
export default function DesignerReturnToCanvasButton() {
    return (
        <Link
            href="/designer"
            scroll={false}
            className={`inline-flex items-center gap-2 rounded-lg border border-violet-200/70 bg-white px-3.5 py-2 text-sm font-semibold text-violet-800 shadow-sm transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-900 ${INTERACTIVE_BUTTON_MOTION}`}
        >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            Return to canvas
        </Link>
    );
}
