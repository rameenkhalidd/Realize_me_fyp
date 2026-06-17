'use client';

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { LogOut } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

import ChangeDisplayNameForm from '@/components/account/ChangeDisplayNameForm';
import ChangePasswordForm from '@/components/account/ChangePasswordForm';
import { useSignOutConfirm } from '@/components/designer/SignOutConfirmContext';
import { useAuth } from '@/components/auth/AuthProvider';
import {
    formatMemberSince,
    getAccountInitial,
    getSignInMethodLabel,
} from '@/lib/auth-user-utils';
import { INTERACTIVE_BUTTON_MOTION } from '@/lib/interactive-button-motion';

const TOAST_CLASS =
    'fixed bottom-6 right-6 z-10050 w-[min(calc(100vw-2rem),20rem)] rounded-xl border border-purple-200/90 bg-white/95 px-4 py-3 text-sm text-gray-700 shadow-md backdrop-blur-sm ring-1 ring-violet-500/10 transition-opacity duration-500';

function SettingsSection({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-purple-100/80 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-violet-600">{title}</h2>
            <div className="mt-4">{children}</div>
        </section>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:items-center sm:gap-4">
            <dt className="text-sm text-gray-500">{label}</dt>
            <dd className="text-sm font-medium text-gray-900">{value}</dd>
        </div>
    );
}

type AccountSettingsCardProps = {
    user: User;
};

export default function AccountSettingsCard({ user }: AccountSettingsCardProps) {
    const { isEmailPasswordUser } = useAuth();
    const { requestSignOut } = useSignOutConfirm();
    const reduceMotion = useReducedMotion();
    const [toast, setToast] = useState<string | null>(null);
    const emailPassword = isEmailPasswordUser(user);

    useEffect(() => {
        if (!toast) {
            return;
        }
        const id = window.setTimeout(() => setToast(null), 3000);
        return () => window.clearTimeout(id);
    }, [toast]);

    return (
        <>
            {toast ? (
                <div role="status" className={TOAST_CLASS} aria-live="polite">
                    {toast}
                </div>
            ) : null}

            <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.3 }}
                className="space-y-6"
            >
                <SettingsSection title="Account info">
                    <dl className="space-y-3">
                        <InfoRow label="Email" value={user.email ?? '—'} />
                        <InfoRow label="Sign-in method" value={getSignInMethodLabel(user)} />
                        <InfoRow
                            label="Member since"
                            value={formatMemberSince(user.metadata.creationTime)}
                        />
                    </dl>
                </SettingsSection>

                <SettingsSection title="Profile">
                    <div className="mb-4 flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-violet-500 to-cyan-500 text-sm font-bold text-white">
                            {getAccountInitial(user)}
                        </span>
                    </div>
                    <ChangeDisplayNameForm user={user} />
                </SettingsSection>

                <SettingsSection title="Security">
                    {emailPassword ? (
                        <ChangePasswordForm
                            user={user}
                            onResetEmailSent={() =>
                                setToast('Reset link sent — check your inbox.')
                            }
                        />
                    ) : (
                        <p className="rounded-xl border border-purple-100 bg-purple-50/50 px-4 py-3 text-sm text-gray-600">
                            You signed in with Google. Password is managed by Google.
                        </p>
                    )}
                </SettingsSection>

                <SettingsSection title="Session">
                    <p className="text-sm text-gray-500">Sign out of Realize Me on this device.</p>
                    <button
                        type="button"
                        onClick={requestSignOut}
                        className={`mt-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${INTERACTIVE_BUTTON_MOTION}`}
                    >
                        <LogOut size={18} aria-hidden />
                        Sign out
                    </button>
                </SettingsSection>
            </motion.div>
        </>
    );
}
