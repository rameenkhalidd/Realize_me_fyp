import { NextRequest } from 'next/server';
import { proxyJsonWithAuth } from '@/lib/realize-backend-proxy';

export async function POST(req: NextRequest) {
    const body = await req.text();
    return proxyJsonWithAuth(req, '/api/search-results', body);
}
