import { NextRequest, NextResponse } from 'next/server';
import { verifyBearerIdTokenFromRequest } from '@/lib/firebase/admin';

export function getRealizeBackendBaseUrl(): string | null {
    const base = process.env.REALIZEME_BACKEND_URL?.replace(/\/$/, '');
    return base || null;
}

/** Forward the incoming Authorization header to FastAPI (session routes verify JWT there too). */
export async function forwardToRealizeBackend(
    req: NextRequest,
    path: string,
    init: RequestInit
): Promise<Response> {
    const base = getRealizeBackendBaseUrl();
    if (!base) {
        throw new Error('REALIZEME_BACKEND_URL is not set');
    }
    const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = new Headers(init.headers);
    const auth = req.headers.get('authorization');
    if (auth) {
        headers.set('Authorization', auth);
    }
    return fetch(url, { ...init, headers });
}

export async function proxyJsonWithAuth(
    req: NextRequest,
    backendPath: string,
    body: string,
    method: 'POST' | 'PUT' | 'PATCH' = 'POST'
): Promise<NextResponse> {
    try {
        await verifyBearerIdTokenFromRequest(req);
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const base = getRealizeBackendBaseUrl();
    if (!base) {
        return NextResponse.json({ error: 'Backend not configured', details: 'REALIZEME_BACKEND_URL' }, { status: 503 });
    }
    try {
        const res = await forwardToRealizeBackend(req, backendPath, {
            method,
            body,
            headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
    } catch (e) {
        console.error('Realize proxy error:', e);
        return NextResponse.json(
            { error: 'Proxy failed', details: e instanceof Error ? e.message : 'Unknown' },
            { status: 502 }
        );
    }
}
