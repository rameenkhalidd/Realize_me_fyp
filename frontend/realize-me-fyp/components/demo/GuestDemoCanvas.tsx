'use client';

import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';

import CustomStylePanel from '@/components/tldraw/CustomStylePanel';
import GuestDemoToolbar from '@/components/demo/GuestDemoToolbar';

export default function GuestDemoCanvas() {
    return (
        <div className="relative h-full w-full bg-white">
            <Tldraw hideUi inferDarkMode={false}>
                <GuestDemoToolbar />
                <CustomStylePanel />
            </Tldraw>
        </div>
    );
}
