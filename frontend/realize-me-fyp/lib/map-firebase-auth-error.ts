import { FirebaseError } from 'firebase/app';

/**
 * Maps Firebase Auth errors to short, user-facing copy.
 */
export function mapFirebaseAuthError(error: unknown): string {
    if (error instanceof FirebaseError) {
        switch (error.code) {
            case 'auth/invalid-email':
                return 'That email address does not look valid.';
            case 'auth/user-disabled':
                return 'This account has been disabled. Contact support if you need help.';
            case 'auth/user-not-found':
                return 'No account found with that email. Check the address or sign up.';
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                return 'Incorrect password. Try again or send yourself a reset link.';
            case 'auth/requires-recent-login':
                return 'For security, sign out and sign in again, then retry this change.';
            case 'auth/missing-password':
                return 'Enter your current password to continue.';
            case 'auth/invalid-credential':
            case 'auth/invalid-login-credentials':
                return 'Email or password is incorrect. Try again.';
            case 'auth/email-already-in-use':
                return 'An account already exists with this email. Try logging in instead.';
            case 'auth/weak-password':
                return 'Password is too weak. Use at least 6 characters (we recommend 8+).';
            case 'auth/network-request-failed':
                return 'Network error. Check your connection and try again.';
            case 'auth/too-many-requests':
                return 'Too many attempts. Wait a few minutes and try again.';
            case 'auth/popup-closed-by-user':
                return 'Sign-in was closed before finishing. Try again if you want to use Google.';
            case 'auth/cancelled-popup-request':
                return 'Another sign-in popup is already open.';
            case 'auth/popup-blocked':
                return 'Your browser blocked the sign-in popup. Allow popups for this site and try again.';
            case 'auth/account-exists-with-different-credential':
                return 'An account already exists with this email using a different sign-in method.';
            case 'auth/operation-not-allowed':
                return 'This sign-in method is not enabled in the Firebase project.';
            default:
                return error.message || 'Something went wrong. Please try again.';
        }
    }

    if (error instanceof Error) {
        if (error.message === 'Firebase Auth is not configured') {
            return 'Sign-in is not set up yet. Add Firebase keys to your environment (see .env.example).';
        }
        return error.message;
    }

    return 'Something went wrong. Please try again.';
}
