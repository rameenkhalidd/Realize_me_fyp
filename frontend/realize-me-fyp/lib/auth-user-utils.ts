import type { User } from 'firebase/auth';

/** True when the user can sign in with email + password (not Google-only). */
export function isEmailPasswordUser(user: User | null): boolean {
    return Boolean(user?.providerData.some((provider) => provider.providerId === 'password'));
}

export function getSignInMethodLabel(user: User): string {
    if (user.providerData.some((provider) => provider.providerId === 'google.com')) {
        return 'Google';
    }
    if (user.providerData.some((provider) => provider.providerId === 'password')) {
        return 'Email & password';
    }
    return user.providerData[0]?.providerId ?? 'Unknown';
}

export function formatMemberSince(creationTime?: string): string {
    if (!creationTime) {
        return '—';
    }
    return new Date(creationTime).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
    });
}

export function getAccountInitial(user: User | null): string {
    const label = user?.displayName?.trim() || user?.email?.trim() || '';
    return label.charAt(0).toUpperCase() || '?';
}

/** Visible name for header account pill — display name, else email local part. */
export function getHeaderDisplayName(user: User | null): string {
    if (!user) {
        return '';
    }

    const displayName = user.displayName?.trim();
    if (displayName) {
        return displayName;
    }

    const email = user.email?.trim();
    if (!email) {
        return '';
    }

    const at = email.indexOf('@');
    if (at > 0) {
        return email.slice(0, at);
    }

    return email;
}
