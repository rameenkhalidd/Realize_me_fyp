import { sendEmailVerification, type ActionCodeSettings, type User } from 'firebase/auth';

import { isEmailPasswordUser } from '@/lib/auth-user-utils';

/** Thrown when an email/password user signs in before verifying their inbox. */
export class EmailNotVerifiedError extends Error {
    readonly code = 'auth/email-not-verified';

    constructor() {
        super('Please verify your email before signing in.');
        this.name = 'EmailNotVerifiedError';
    }
}

/**
 * After the user clicks the link in their inbox, Firebase redirects here.
 * Firebase Console → Authentication → Settings → Authorized domains must include `localhost` for local dev.
 */
export function getEmailVerificationContinueUrl(nextPath?: string | null): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = new URL('/login', origin || 'http://localhost:3000');
    url.searchParams.set('verified', '1');
    if (nextPath) {
        url.searchParams.set('next', nextPath);
    }
    return url.toString();
}

function getActionCodeSettings(nextPath?: string | null): ActionCodeSettings {
    return {
        url: getEmailVerificationContinueUrl(nextPath),
        handleCodeInApp: false,
    };
}

export async function sendVerificationEmailToUser(user: User, nextPath?: string | null): Promise<void> {
    await sendEmailVerification(user, getActionCodeSettings(nextPath));
}

/** Email/password accounts must verify; Google and other providers are exempt. */
export function isEmailVerificationRequired(user: User | null): boolean {
    if (!user) {
        return false;
    }
    return isEmailPasswordUser(user) && !user.emailVerified;
}

/** True when a signed-in user may enter the designer without being bounced to login. */
export function canAccessAppWithCurrentUser(user: User | null): boolean {
    if (!user) {
        return false;
    }
    return !isEmailVerificationRequired(user);
}
