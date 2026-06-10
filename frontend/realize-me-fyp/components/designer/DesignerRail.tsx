'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    History,
    SquarePen,
    LogOut,
    PanelLeft,
    Save,
} from 'lucide-react';

import { useAuth } from '@/components/auth/AuthProvider';
import { useDesignerDraftOptional } from '@/components/designer/DesignerDraftContext';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { INTERACTIVE_BUTTON_MOTION } from '@/lib/interactive-button-motion';

type DesignerRailProps = {
    onCloseSidebar: () => void;
};

function RailIconButton({
    active,
    title,
    onClick,
    href,
    children,
    disabled,
}: {
    active?: boolean;
    title: string;
    onClick?: () => void;
    href?: string;
    children: ReactNode;
    disabled?: boolean;
}) {
    const className = `inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 disabled:pointer-events-none disabled:opacity-40 ${INTERACTIVE_BUTTON_MOTION} ${
        active
            ? 'bg-gray-800 text-white'
            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
    }`;

    if (href) {
        return (
            <Link href={href} className={className} title={title} scroll={false}>
                {children}
            </Link>
        );
    }

    return (
        <button
            type="button"
            className={className}
            title={title}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
}

export default function DesignerRail({ onCloseSidebar }: DesignerRailProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, signOut } = useAuth();
    const draft = useDesignerDraftOptional();

    const onDesign = pathname === '/designer';
    const onHistory = pathname.startsWith('/designer/history');

    const accountLabel = user?.email ?? user?.displayName ?? '';
    const initial = accountLabel.trim().charAt(0).toUpperCase() || '?';

    const handleSignOut = async () => {
        try {
            await signOut();
        } finally {
            router.replace('/login');
        }
    };

    const handleSaveDraft = () => {
        if (draft && onDesign) {
            void draft.saveDraft();
        }
    };

    return (
        <div className="flex w-14 flex-col items-center gap-4 py-4">
            <RailIconButton title="Close sidebar" onClick={onCloseSidebar}>
                <PanelLeft className="h-5 w-5" aria-hidden />
            </RailIconButton>

            <div className="my-1 h-px w-8 bg-gray-800" aria-hidden />

            <RailIconButton
                href="/designer"
                active={onDesign}
                title="Design — Draw sketches and run AI generation"
            >
                <SquarePen className="h-5 w-5" aria-hidden />
            </RailIconButton>

            <RailIconButton
                href="/designer/history"
                active={onHistory}
                title="My work — View past generations and reopen sketches"
            >
                <History className="h-5 w-5" aria-hidden />
            </RailIconButton>

            {draft?.visible && onDesign ? (
                <RailIconButton
                    title="Save draft — Stores sketch to your account"
                    onClick={handleSaveDraft}
                    disabled={draft.saveDisabled}
                >
                    <Save className="h-5 w-5" aria-hidden />
                </RailIconButton>
            ) : null}

            <div className="mt-auto flex w-full flex-col items-center gap-4">
                <div className="h-px w-8 bg-gray-800" aria-hidden />

                {isFirebaseConfigured() && user ? (
                    <>
                        <div
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-violet-500 to-cyan-500 text-xs font-bold text-white"
                            title={accountLabel || 'Signed in'}
                        >
                            {initial}
                        </div>
                        <RailIconButton title="Sign out" onClick={() => void handleSignOut()}>
                            <LogOut className="h-5 w-5" aria-hidden />
                        </RailIconButton>
                    </>
                ) : null}
            </div>
        </div>
    );
}
