'use client';

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';

import { useAuth } from '@/components/auth/AuthProvider';
import { displayNameSchema } from '@/lib/auth-schemas';
import { INTERACTIVE_BUTTON_MOTION } from '@/lib/interactive-button-motion';

const inputClass =
    'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20';

type ChangeDisplayNameFormProps = {
    user: User;
};

export default function ChangeDisplayNameForm({ user }: ChangeDisplayNameFormProps) {
    const { updateDisplayName } = useAuth();
    const [displayName, setDisplayName] = useState(user.displayName?.trim() || '');
    const [editing, setEditing] = useState(false);
    const [draftName, setDraftName] = useState(displayName);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const next = user.displayName?.trim() || '';
        setDisplayName(next);
        if (!editing) {
            setDraftName(next);
        }
    }, [user.displayName, editing]);

    useEffect(() => {
        if (!success) {
            return;
        }
        const id = window.setTimeout(() => setSuccess(false), 2000);
        return () => window.clearTimeout(id);
    }, [success]);

    const startEdit = () => {
        setDraftName(displayName);
        setError(null);
        setEditing(true);
    };

    const cancelEdit = () => {
        setDraftName(displayName);
        setError(null);
        setEditing(false);
    };

    const handleSave = async () => {
        const parsed = displayNameSchema.safeParse(draftName);
        if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? "Name can't be empty.");
            return;
        }

        setSaving(true);
        setError(null);
        const result = await updateDisplayName(parsed.data);
        setSaving(false);

        if (!result.success) {
            setError(result.error ?? 'Could not update your name.');
            return;
        }

        setDisplayName(parsed.data);
        setEditing(false);
        setSuccess(true);
    };

    return (
        <div className="transition-all duration-200">
            {!editing ? (
                <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm font-medium text-gray-900">
                        {displayName || 'No name set'}
                    </p>
                    <button
                        type="button"
                        onClick={startEdit}
                        className={`text-xs font-medium text-violet-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${INTERACTIVE_BUTTON_MOTION}`}
                    >
                        Edit
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    <input
                        type="text"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        className={inputClass}
                        autoComplete="name"
                        aria-label="Display name"
                        maxLength={80}
                    />
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => void handleSave()}
                            disabled={saving}
                            className={`rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${INTERACTIVE_BUTTON_MOTION}`}
                        >
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={saving}
                            className={`rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${INTERACTIVE_BUTTON_MOTION}`}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
            <p className="mt-2 text-xs text-gray-500">This is how your name appears in the app.</p>
            {error ? (
                <p className="mt-2 text-xs text-red-600" role="alert">
                    {error}
                </p>
            ) : null}
            {success ? (
                <p className="mt-2 text-xs text-emerald-600" aria-live="polite">
                    Name updated
                </p>
            ) : null}
        </div>
    );
}
