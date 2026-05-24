import 'server-only';

import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import type { NextRequest } from 'next/server';

function getAdminEnv() {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            'Firebase Admin env is incomplete. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY.'
        );
    }

    return { projectId, clientEmail, privateKey };
}

function getAdminApp(): App {
    const existing = getApps()[0];
    if (existing) {
        return existing;
    }

    const { projectId, clientEmail, privateKey } = getAdminEnv();

    return initializeApp({
        credential: cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });
}

export function getFirebaseAdminAuth(): Auth {
    return getAuth(getAdminApp());
}

function parseBearerToken(req: NextRequest): string | null {
    const header = req.headers.get('authorization');
    if (!header) return null;

    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) return null;
    return token;
}

export async function verifyBearerIdTokenFromRequest(req: NextRequest) {
    const idToken = parseBearerToken(req);
    if (!idToken) {
        throw new Error('Missing bearer token');
    }

    return getFirebaseAdminAuth().verifyIdToken(idToken);
}
