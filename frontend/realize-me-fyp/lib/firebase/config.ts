import type { FirebaseOptions } from 'firebase/app';

/** Shape of the Firebase web SDK config object (from console / env). */
export type FirebaseWebConfig = FirebaseOptions;

/**
 * Minimum env set required to initialize the Firebase web app + Auth client.
 */
export function isFirebaseConfigured(): boolean {
    return Boolean(
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
            process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    );
}

/**
 * Typed web config from NEXT_PUBLIC_* vars (safe to ship to the browser).
 * Returns null when required keys are missing.
 */
export function getFirebaseWebConfig(): FirebaseOptions | null {
    if (!isFirebaseConfigured()) {
        return null;
    }

    return {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
}
