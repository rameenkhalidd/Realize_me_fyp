import { NextRequest, NextResponse } from 'next/server';
import { verifyBearerIdTokenFromRequest } from '@/lib/firebase/admin';
import { forwardToRealizeBackend, getRealizeBackendBaseUrl } from '@/lib/realize-backend-proxy';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
    try {
        await verifyBearerIdTokenFromRequest(req);
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!getRealizeBackendBaseUrl()) {
        return NextResponse.json({ error: 'Backend not configured' }, { status: 503 });
    }
    const { id } = await context.params;
    try {
        const res = await forwardToRealizeBackend(
            req,
            `/api/history/${encodeURIComponent(id)}/results`,
            { method: 'GET' }
        );
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Proxy failed' }, { status: 502 });
    }
}
