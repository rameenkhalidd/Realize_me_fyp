import { Suspense, type ReactNode } from 'react';

import { DesignerDraftProvider } from '@/components/designer/DesignerDraftContext';
import DesignerShell from '@/components/designer/DesignerShell';

function DesignerLayoutFallback() {
    return (
        <div className="flex h-screen items-center justify-center bg-linear-to-br from-purple-50 via-white to-blue-50 font-roboto">
            <p className="text-sm text-gray-600">Loading…</p>
        </div>
    );
}

export default function DesignerLayout({ children }: { children: ReactNode }) {
    return (
        <Suspense fallback={<DesignerLayoutFallback />}>
            <DesignerDraftProvider>
                <DesignerShell>{children}</DesignerShell>
            </DesignerDraftProvider>
        </Suspense>
    );
}
