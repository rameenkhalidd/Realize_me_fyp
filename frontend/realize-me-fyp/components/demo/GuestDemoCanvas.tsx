'use client';

import { useEffect, useRef, useState } from 'react';
import { Editor, Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';

import CustomStylePanel from '@/components/tldraw/CustomStylePanel';
import GuestDemoToolbar from '@/components/demo/GuestDemoToolbar';
import DesignerKeyboardShortcuts from '@/components/tldraw/DesignerKeyboardShortcuts';
import { setupDesignerCamera } from '@/lib/tldraw-utils';
import { useEmptyCanvasZoomReset } from '@/hooks/useEmptyCanvasZoomReset';

export default function GuestDemoCanvas() {
    const [editor, setEditor] = useState<Editor | null>(null);
    const cameraCleanupRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!editor) return;
        cameraCleanupRef.current?.();
        cameraCleanupRef.current = setupDesignerCamera(editor);
        return () => {
            cameraCleanupRef.current?.();
            cameraCleanupRef.current = null;
        };
    }, [editor]);

    useEmptyCanvasZoomReset(editor);

    return (
        <div className="relative h-full w-full bg-white">
            <Tldraw hideUi inferDarkMode={false} onMount={setEditor}>
                <DesignerKeyboardShortcuts />
                <GuestDemoToolbar />
                <CustomStylePanel />
            </Tldraw>
        </div>
    );
}
