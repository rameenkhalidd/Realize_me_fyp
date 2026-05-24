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
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut as firebaseSignOut,
    createUserWithEmailAndPassword,
    updateProfile,
} from 'firebase/auth';

import { getFirebaseAuth } from '@/lib/firebase/client-app';
import { isFirebaseConfigured } from '@/lib/firebase/config';

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
        }),
        [user, loading, configured, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut]
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
