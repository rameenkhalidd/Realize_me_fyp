'use client';

import { Check, X } from 'lucide-react';

type PasswordMatchIndicatorProps = {
    password: string;
    confirmPassword: string;
};

export default function PasswordMatchIndicator({ password, confirmPassword }: PasswordMatchIndicatorProps) {
    if (confirmPassword.length === 0) {
        return null;
    }

    const passwordsMatch = password === confirmPassword;

    return (
        <div className="mt-1.5 flex items-center gap-1 text-xs">
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
    );
}
