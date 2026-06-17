'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import {
    EmailAuthProvider,
    GoogleAuthProvider,
    onAuthStateChanged,
    reauthenticateWithCredential,
    sendPasswordResetEmail as firebaseSendPasswordResetEmail,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut as firebaseSignOut,
    createUserWithEmailAndPassword,
    updatePassword as firebaseUpdatePassword,
    updateProfile,
} from 'firebase/auth';

import { isEmailPasswordUser } from '@/lib/auth-user-utils';
import { getFirebaseAuth } from '@/lib/firebase/client-app';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { mapFirebaseAuthError } from '@/lib/map-firebase-auth-error';

export type AuthActionResult = { success: boolean; error?: string };

export type AuthContextValue = {
    user: User | null;
    loading: boolean;
    uid: string | null;
    /** True when NEXT_PUBLIC_FIREBASE_* minimum set is present */
    configured: boolean;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    updateDisplayName: (name: string) => Promise<AuthActionResult>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<AuthActionResult>;
    sendPasswordResetEmail: (email: string) => Promise<AuthActionResult>;
    isEmailPasswordUser: (user: User | null) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const configured = isFirebaseConfigured();
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    /** When Firebase is off, we treat auth as resolved immediately. */
    const [authResolved, setAuthResolved] = useState(!configured);

    useEffect(() => {
        if (!configured) {
            return;
        }

        const auth = getFirebaseAuth();
        if (!auth) {
            queueMicrotask(() => {
                setAuthResolved(true);
            });
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
            setFirebaseUser(nextUser);
            setAuthResolved(true);
        });

        return () => unsubscribe();
    }, [configured]);

    const user = configured ? firebaseUser : null;
    const loading = configured && !authResolved;

    const signInWithEmail = useCallback(async (email: string, password: string) => {
        const auth = getFirebaseAuth();
        if (!auth) {
            throw new Error('Firebase Auth is not configured');
        }
        await signInWithEmailAndPassword(auth, email, password);
    }, []);

    const signUpWithEmail = useCallback(async (email: string, password: string, displayName?: string) => {
        const auth = getFirebaseAuth();
        if (!auth) {
            throw new Error('Firebase Auth is not configured');
        }
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const name = displayName?.trim();
        if (name) {
            await updateProfile(credential.user, { displayName: name });
        }
    }, []);

    const signInWithGoogle = useCallback(async () => {
        const auth = getFirebaseAuth();
        if (!auth) {
            throw new Error('Firebase Auth is not configured');
        }
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    }, []);

    const signOut = useCallback(async () => {
        const auth = getFirebaseAuth();
        if (!auth) {
            return;
        }
        await firebaseSignOut(auth);
    }, []);

    const refreshCurrentUser = useCallback(async () => {
        const auth = getFirebaseAuth();
        const current = auth?.currentUser;
        if (!current) {
            return;
        }
        await current.reload();
        setFirebaseUser(auth!.currentUser);
    }, []);

    const updateDisplayName = useCallback(async (name: string): Promise<AuthActionResult> => {
        const auth = getFirebaseAuth();
        const current = auth?.currentUser;
        if (!auth || !current) {
            return { success: false, error: 'You need to be signed in to update your name.' };
        }
        try {
            await updateProfile(current, { displayName: name.trim() });
            await refreshCurrentUser();
            return { success: true };
        } catch (error) {
            return { success: false, error: mapFirebaseAuthError(error) };
        }
    }, [refreshCurrentUser]);

    const changePassword = useCallback(
        async (currentPassword: string, newPassword: string): Promise<AuthActionResult> => {
            const auth = getFirebaseAuth();
            const current = auth?.currentUser;
            if (!auth || !current) {
                return { success: false, error: 'You need to be signed in to change your password.' };
            }
            if (!current.email) {
                return { success: false, error: 'This account has no email address for re-authentication.' };
            }
            try {
                const credential = EmailAuthProvider.credential(current.email, currentPassword);
                await reauthenticateWithCredential(current, credential);
                await firebaseUpdatePassword(current, newPassword);
                await refreshCurrentUser();
                return { success: true };
            } catch (error) {
                return { success: false, error: mapFirebaseAuthError(error) };
            }
        },
        [refreshCurrentUser]
    );

    const sendPasswordResetEmail = useCallback(async (email: string): Promise<AuthActionResult> => {
        const auth = getFirebaseAuth();
        if (!auth) {
            return { success: false, error: 'Firebase Auth is not configured' };
        }
        try {
            await firebaseSendPasswordResetEmail(auth, email.trim());
            return { success: true };
        } catch (error) {
            return { success: false, error: mapFirebaseAuthError(error) };
        }
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            loading,
            uid: user?.uid ?? null,
            configured,
            signInWithEmail,
            signUpWithEmail,
            signInWithGoogle,
            signOut,
            updateDisplayName,
            changePassword,
            sendPasswordResetEmail,
            isEmailPasswordUser,
        }),
        [
            user,
            loading,
            configured,
            signInWithEmail,
            signUpWithEmail,
            signInWithGoogle,
            signOut,
            updateDisplayName,
            changePassword,
            sendPasswordResetEmail,
        ]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return ctx;
}
