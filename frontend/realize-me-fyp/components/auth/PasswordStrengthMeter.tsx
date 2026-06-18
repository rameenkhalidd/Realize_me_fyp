'use client';

import { useMemo } from 'react';

import { getPasswordStrength } from '@/lib/password-policy';

type PasswordStrengthMeterProps = {
    password: string;
};

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
    const strength = useMemo(() => getPasswordStrength(password), [password]);

    if (password.length === 0) {
        return null;
    }

    return (
        <div className="mt-2 space-y-1.5" aria-live="polite">
            <div className="grid grid-cols-4 gap-1.5" role="presentation">
                {strength.pillColors.map((color, index) => (
                    <div
                        key={index}
                        className={`h-1 rounded-full transition-all duration-300 ${color}`}
                    />
                ))}
            </div>
            <p className="text-xs text-gray-500">{strength.label}</p>
        </div>
    );
}
