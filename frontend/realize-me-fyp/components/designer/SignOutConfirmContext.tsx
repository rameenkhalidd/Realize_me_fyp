'use client';

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';

import SignOutConfirmDialog from '@/components/designer/SignOutConfirmDialog';
import { useDesignerDraftOptional } from '@/components/designer/DesignerDraftContext';
import { useAuth } from '@/components/auth/AuthProvider';

type SignOutConfirmContextValue = {
    requestSignOut: () => void;
};

const SignOutConfirmContext = createContext<SignOutConfirmContextValue | null>(null);

export function SignOutConfirmProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { signOut } = useAuth();
    const draftContext = useDesignerDraftOptional();

    const [open, setOpen] = useState(false);
    const [signingOut, setSigningOut] = useState(false);

    const draft = useMemo(() => {
        if (!draftContext) {
            return null;
        }
        return {
            status: draftContext.status,
            lastSavedAt: draftContext.lastSavedAt,
            visible: draftContext.visible,
            hasCanvasShapes: draftContext.hasCanvasShapes,
        };
    }, [draftContext]);

    const requestSignOut = useCallback(() => {
        setOpen(true);
    }, []);

    const handleCancel = useCallback(() => {
        if (signingOut) {
            return;
        }
        setOpen(false);
    }, [signingOut]);

    const handleConfirm = useCallback(async () => {
        if (signingOut || draft?.status === 'saving') {
            return;
        }

        setSigningOut(true);
        try {
            await signOut();
            setOpen(false);
            router.replace('/login');
        } catch {
            setSigningOut(false);
        }
    }, [draft?.status, router, signOut, signingOut]);

    const value = useMemo(() => ({ requestSignOut }), [requestSignOut]);

    return (
        <SignOutConfirmContext.Provider value={value}>
            {children}
            <SignOutConfirmDialog
                open={open}
                signingOut={signingOut}
                pathname={pathname}
                draft={draft}
                onCancel={handleCancel}
                onConfirm={() => void handleConfirm()}
            />
        </SignOutConfirmContext.Provider>
    );
}

export function useSignOutConfirm(): SignOutConfirmContextValue {
    const ctx = useContext(SignOutConfirmContext);
    if (!ctx) {
        throw new Error('useSignOutConfirm must be used within SignOutConfirmProvider');
    }
    return ctx;
}
