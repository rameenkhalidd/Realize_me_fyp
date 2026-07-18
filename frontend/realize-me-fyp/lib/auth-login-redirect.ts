import type { User } from 'firebase/auth';

import { canAccessAppWithCurrentUser } from '@/lib/firebase/email-verification';

/** Build /login?checkEmail=1 preserving an optional post-login destination. */
export function buildLoginCheckEmailHref(nextPath?: string | null): string {
    const params = new URLSearchParams({ checkEmail: '1' });
    if (nextPath) {
        params.set('next', nextPath);
    }
    return `/login?${params.toString()}`;
}

/** Only verified email/password users and OAuth users should auto-leave auth pages. */
export function shouldAutoRedirectAuthenticatedUser(user: User | null): boolean {
    return canAccessAppWithCurrentUser(user);
}
