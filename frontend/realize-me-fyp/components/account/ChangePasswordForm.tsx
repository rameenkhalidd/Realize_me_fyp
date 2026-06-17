'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import { Check, Eye, EyeOff, Loader2, X } from 'lucide-react';

import { useAuth } from '@/components/auth/AuthProvider';
import { changePasswordSchema } from '@/lib/auth-schemas';
import { INTERACTIVE_BUTTON_MOTION } from '@/lib/interactive-button-motion';

const fieldClass =
    'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 pr-11 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20';

type PasswordFieldProps = {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    autoComplete: string;
    invalid?: boolean;
};

function PasswordField({ id, label, value, onChange, autoComplete, invalid }: PasswordFieldProps) {
    const [visible, setVisible] = useState(false);

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700">
                {label}
            </label>
            <div className="relative mt-1.5">
                <input
                    id={id}
                    type={visible ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    autoComplete={autoComplete}
                    className={`${fieldClass} ${invalid ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                />
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                    aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
                >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
        </div>
    );
}

function getPasswordStrength(password: string): { score: number; label: string; pillColors: string[] } {
    if (password.length === 0) {
        return { score: 0, label: '', pillColors: ['bg-gray-200', 'bg-gray-200', 'bg-gray-200', 'bg-gray-200'] };
    }
    if (password.length < 8) {
        return {
            score: 1,
            label: 'Too short',
            pillColors: ['bg-red-400', 'bg-gray-200', 'bg-gray-200', 'bg-gray-200'],
        };
    }

    let points = 1;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) {
        points += 1;
    }
    if (password.length >= 12) {
        points += 1;
    }
    if (/[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password)) {
        points += 1;
    }

    const score = Math.min(4, Math.max(2, points));
    if (score === 2) {
        return {
            score,
            label: 'Add a number or symbol',
            pillColors: ['bg-orange-400', 'bg-orange-400', 'bg-gray-200', 'bg-gray-200'],
        };
    }
    if (score === 3) {
        return {
            score,
            label: 'Looking good',
            pillColors: ['bg-yellow-400', 'bg-yellow-400', 'bg-yellow-400', 'bg-gray-200'],
        };
    }
    return {
        score: 4,
        label: 'Strong password',
        pillColors: ['bg-emerald-500', 'bg-emerald-500', 'bg-emerald-500', 'bg-emerald-500'],
    };
}

type ChangePasswordFormProps = {
    user: User;
    onResetEmailSent: () => void;
};

export default function ChangePasswordForm({ user, onResetEmailSent }: ChangePasswordFormProps) {
    const { changePassword, sendPasswordResetEmail } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [currentError, setCurrentError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [sendingReset, setSendingReset] = useState(false);
    const [success, setSuccess] = useState(false);

    const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
    const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
    const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

    const canSubmit = useMemo(() => {
        const parsed = changePasswordSchema.safeParse({
            currentPassword,
            newPassword,
            confirmPassword,
        });
        return parsed.success;
    }, [currentPassword, newPassword, confirmPassword]);

    useEffect(() => {
        setCurrentError(null);
        setFormError(null);
        if (currentPassword || newPassword || confirmPassword) {
            setSuccess(false);
        }
    }, [currentPassword, newPassword, confirmPassword]);

    useEffect(() => {
        if (!success) {
            return;
        }
        const id = window.setTimeout(() => setSuccess(false), 3000);
        return () => window.clearTimeout(id);
    }, [success]);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const parsed = changePasswordSchema.safeParse({
            currentPassword,
            newPassword,
            confirmPassword,
        });
        if (!parsed.success) {
            setFormError(parsed.error.issues[0]?.message ?? 'Check your password fields.');
            return;
        }

        setSaving(true);
        setCurrentError(null);
        setFormError(null);
        const result = await changePassword(parsed.data.currentPassword, parsed.data.newPassword);
        setSaving(false);

        if (!result.success) {
            setCurrentError(result.error ?? 'Could not update your password.');
            return;
        }

        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setFormError(null);
        setSuccess(true);
    };

    const handleSendReset = async () => {
        const email = user.email?.trim();
        if (!email) {
            setFormError('No email is linked to this account.');
            return;
        }

        setSendingReset(true);
        setFormError(null);
        const result = await sendPasswordResetEmail(email);
        setSendingReset(false);

        if (!result.success) {
            setFormError(result.error ?? 'Could not send reset email.');
            return;
        }

        onResetEmailSent();
    };

    return (
        <form className="space-y-4 transition-all duration-200" onSubmit={(e) => void handleSubmit(e)} noValidate>
            <PasswordField
                id="current-password"
                label="Current password"
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
                invalid={Boolean(currentError)}
            />
            {currentError ? (
                <p className="text-xs text-red-600" role="alert">
                    {currentError}
                </p>
            ) : null}

            <div>
                <PasswordField
                    id="new-password"
                    label="New password"
                    value={newPassword}
                    onChange={setNewPassword}
                    autoComplete="new-password"
                />
                {newPassword.length > 0 ? (
                    <div className="mt-2 space-y-1.5">
                        <div className="grid grid-cols-4 gap-1.5">
                            {strength.pillColors.map((color, index) => (
                                <div
                                    key={index}
                                    className={`h-1 rounded-full transition-all duration-300 ${color}`}
                                />
                            ))}
                        </div>
                        <p className="text-xs text-gray-500">{strength.label}</p>
                    </div>
                ) : null}
            </div>

            <div>
                <PasswordField
                    id="confirm-password"
                    label="Confirm new password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    autoComplete="new-password"
                    invalid={passwordsMismatch}
                />
                {confirmPassword.length > 0 ? (
                    <div
                        className={`mt-1.5 flex items-center gap-1 text-xs transition-opacity duration-200 ${
                            passwordsMatch || passwordsMismatch ? 'opacity-100' : 'opacity-0'
                        }`}
                    >
                        {passwordsMatch ? (
                            <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                                <span className="text-emerald-600">Passwords match</span>
                            </>
                        ) : (
                            <>
                                <X className="h-3.5 w-3.5 text-red-600" aria-hidden />
                                <span className="text-red-600">Passwords do not match</span>
                            </>
                        )}
                    </div>
                ) : null}
            </div>

            {formError ? (
                <p className="text-xs text-red-600" role="alert">
                    {formError}
                </p>
            ) : null}

            <button
                type="submit"
                disabled={!canSubmit || saving}
                className={`flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${INTERACTIVE_BUTTON_MOTION}`}
            >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {saving ? 'Updating…' : 'Update password'}
            </button>

            {success ? (
                <p className="text-xs text-emerald-600" aria-live="polite">
                    Password updated. Use your new password next time you sign in.
                </p>
            ) : null}

            <div className="group relative inline-block max-w-full">
                <div
                    id="password-reset-help"
                    role="tooltip"
                    className="
                        pointer-events-none absolute bottom-[calc(100%+8px)] left-0 z-10
                        w-max max-w-[18rem] rounded-xl
                        border border-purple-200/90 bg-white/95 px-3 py-2 font-roboto
                        shadow-md backdrop-blur-sm ring-1 ring-violet-500/10
                        opacity-0 transition-opacity duration-150
                        group-hover:opacity-100 group-focus-within:opacity-100
                    "
                >
                    <p className="text-xs font-semibold text-violet-800">Email reset link</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-gray-600">
                        {user.email
                            ? `We'll send a link to ${user.email}. Use this if you can't remember your current password.`
                            : "We'll send a link to your account email if you can't remember your current password."}
                    </p>
                    <p className="text-[11px] leading-snug text-gray-600">
                        Set your new password from the link in your email.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void handleSendReset()}
                    disabled={sendingReset}
                    aria-describedby="password-reset-help"
                    className={`text-left text-xs font-medium text-violet-600 underline-offset-2 hover:underline disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${INTERACTIVE_BUTTON_MOTION}`}
                >
                    {sendingReset ? 'Sending…' : 'Forgot your current password? Email me a reset link'}
                </button>
            </div>
        </form>
    );
}
