import { NextRequest, NextResponse } from 'next/server';
import { verifyBearerIdTokenFromRequest } from '@/lib/firebase/admin';
import { forwardToRealizeBackend, getRealizeBackendBaseUrl } from '@/lib/realize-backend-proxy';

export async function GET(req: NextRequest) {
    try {
        await verifyBearerIdTokenFromRequest(req);
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!getRealizeBackendBaseUrl()) {
        return NextResponse.json({ error: 'Backend not configured' }, { status: 503 });
    }
    const q = req.nextUrl.searchParams.toString();
    const path = q ? `/api/history?${q}` : '/api/history';
    try {
        const res = await forwardToRealizeBackend(req, path, { method: 'GET' });
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Proxy failed' }, { status: 502 });
    }
}
