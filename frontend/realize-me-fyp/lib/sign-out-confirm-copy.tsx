import type { ReactNode } from 'react';

import type { DesignerDraftContextValue } from '@/components/designer/DesignerDraftContext';

export type SignOutDraftSnapshot =
    | Pick<DesignerDraftContextValue, 'status' | 'lastSavedAt' | 'visible' | 'hasCanvasShapes'>
    | null;

const GENERIC_SIGN_OUT_COPY = "You'll need to sign in again to access your workspace.";

function formatSavedTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function showDesignerSketchCopy(
    draft: SignOutDraftSnapshot,
    pathname: string
): draft is NonNullable<SignOutDraftSnapshot> {
    return pathname === '/designer' && draft != null && draft.visible && draft.hasCanvasShapes;
}

/** Plain-text subtitle for aria-describedby. */
export function getSignOutConfirmSubtitleText(
    draft: SignOutDraftSnapshot,
    pathname: string
): string {
    if (draft?.status === 'saving') {
        return 'A save is in progress. Finish signing out after it completes, or you may lose recent sketch changes.';
    }

    if (draft?.status === 'error') {
        return 'Autosave failed. Save your draft first if you need to keep changes on the canvas.';
    }

    if (!showDesignerSketchCopy(draft, pathname)) {
        return GENERIC_SIGN_OUT_COPY;
    }

    if (draft.lastSavedAt) {
        const time = formatSavedTime(draft.lastSavedAt);
        return `Your sketch was last saved at ${time}.`;
    }

    return 'Unsaved sketch changes on the canvas will be lost. Items in My work are kept in your account.';
}

export function SignOutConfirmSubtitle({
    draft,
    pathname,
}: {
    draft: SignOutDraftSnapshot;
    pathname: string;
}): ReactNode {
    if (draft?.status === 'saving') {
        return (
            <>
                A save is in progress. Finish signing out after it completes, or you may lose recent
                sketch changes.
            </>
        );
    }

    if (draft?.status === 'error') {
        return (
            <>Autosave failed. Save your draft first if you need to keep changes on the canvas.</>
        );
    }

    if (!showDesignerSketchCopy(draft, pathname)) {
        return <>{GENERIC_SIGN_OUT_COPY}</>;
    }

    if (draft.lastSavedAt) {
        const time = formatSavedTime(draft.lastSavedAt);
        return (
            <>
                Your sketch was last saved at{' '}
                <span className="font-semibold text-gray-900">{time}</span>. Changes made after that
                are not saved.
            </>
        );
    }

    return (
        <>
            Unsaved sketch changes on the canvas will be lost. Items in My work are kept in your
            account.
        </>
    );
}

export function isSignOutBlockedBySave(draft: SignOutDraftSnapshot): boolean {
    return draft?.status === 'saving';
}
