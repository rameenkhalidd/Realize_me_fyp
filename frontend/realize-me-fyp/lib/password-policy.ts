import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export type PasswordPolicyCheck = 'length' | 'uppercase' | 'lowercase' | 'number';

export const PASSWORD_HINTS: Record<PasswordPolicyCheck | 'complete' | 'strong' | 'empty', string> = {
    empty: '',
    length: 'Use at least 8 characters',
    uppercase: 'Add a capital letter',
    lowercase: 'Add a lowercase letter',
    number: 'Add a number',
    complete: 'Looking good',
    strong: 'Strong password',
};

const CHECK_ORDER: PasswordPolicyCheck[] = ['length', 'uppercase', 'lowercase', 'number'];

export function getPasswordPolicyStatus(password: string): Record<PasswordPolicyCheck, boolean> {
    return {
        length: password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
    };
}

export function isPasswordPolicyMet(password: string): boolean {
    const status = getPasswordPolicyStatus(password);
    return CHECK_ORDER.every((key) => status[key]);
}

export const passwordFieldSchema = z
    .string()
    .min(1, 'Password is required')
    .max(PASSWORD_MAX_LENGTH, 'Password is too long')
    .superRefine((password, ctx) => {
        if (password.length < PASSWORD_MIN_LENGTH) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: PASSWORD_HINTS.length,
            });
            return;
        }
        if (!/[A-Z]/.test(password)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: PASSWORD_HINTS.uppercase,
            });
        }
        if (!/[a-z]/.test(password)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: PASSWORD_HINTS.lowercase,
            });
        }
        if (!/[0-9]/.test(password)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: PASSWORD_HINTS.number,
            });
        }
    });

export type PasswordStrengthResult = {
    score: number;
    label: string;
    pillColors: string[];
    missingChecks: PasswordPolicyCheck[];
};

function pillColorForMet(met: boolean, strong: boolean): string {
    if (!met) {
        return 'bg-gray-200';
    }
    return strong ? 'bg-emerald-500' : 'bg-violet-400';
}

export function getPasswordStrength(password: string): PasswordStrengthResult {
    const emptyPills = ['bg-gray-200', 'bg-gray-200', 'bg-gray-200', 'bg-gray-200'] as const;

    if (password.length === 0) {
        return { score: 0, label: PASSWORD_HINTS.empty, pillColors: [...emptyPills], missingChecks: [...CHECK_ORDER] };
    }

    const status = getPasswordPolicyStatus(password);
    const missingChecks = CHECK_ORDER.filter((key) => !status[key]);
    const metCount = CHECK_ORDER.length - missingChecks.length;
    const allMet = missingChecks.length === 0;
    const strong = allMet && password.length >= 12;

    const pillColors = CHECK_ORDER.map((key) => pillColorForMet(status[key], strong));

    let label: string;
    if (!status.length) {
        label = 'Too short';
    } else if (missingChecks.length > 0) {
        label = PASSWORD_HINTS[missingChecks[0]];
    } else if (strong) {
        label = PASSWORD_HINTS.strong;
    } else {
        label = PASSWORD_HINTS.complete;
    }

    return {
        score: metCount,
        label,
        pillColors,
        missingChecks,
    };
}
