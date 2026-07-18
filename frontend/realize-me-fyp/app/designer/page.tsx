'use client';

import DesignerCanvas from '@/components/tldraw/DesignerCanvas';
import CanvasGuidePanel from '@/components/designer/CanvasGuidePanel';
import { DESIGNER_LAVENDER_PAGE_BACKGROUND } from '@/lib/designer-page-background';

export default function DesignerPage() {
    return (
        <div
            className="flex min-h-0 flex-1 gap-6 overflow-hidden p-6"
            style={{ background: DESIGNER_LAVENDER_PAGE_BACKGROUND }}
        >
            <div className="min-w-0 flex-[3]">
                <div className="h-full min-h-[28rem] overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-xl">
                    <DesignerCanvas />
                </div>
            </div>

            <div className="min-w-0 flex-1">
                <CanvasGuidePanel />
            </div>
        </div>
    );
}
