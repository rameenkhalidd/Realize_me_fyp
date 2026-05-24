'use client';

import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

import { getFirebaseWebConfig, isFirebaseConfigured } from './config';

let cachedApp: FirebaseApp | null = null;

function getOrInitApp(): FirebaseApp | null {
    if (!isFirebaseConfigured()) {
        return null;
    }

    const config = getFirebaseWebConfig();
    if (!config) {
        return null;
    }

    const existing = getApps()[0];
    if (existing) {
        cachedApp = existing;
        return cachedApp;
    }

    cachedApp = initializeApp(config);
    return cachedApp;
}

/** Returns null when Firebase env is incomplete or only on server without init. */
export function getFirebaseAuth(): Auth | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const app = getOrInitApp();
    if (!app) {
        return null;
    }

    return getAuth(app);
}
