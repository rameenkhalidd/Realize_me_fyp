import { NextRequest, NextResponse } from 'next/server';
import { verifyBearerIdTokenFromRequest } from '@/lib/firebase/admin';
import { normalizeSimilarProductList } from '@/lib/similar-products';

const BACKEND_BASE_URL = process.env.REALIZEME_BACKEND_URL?.replace(/\/$/, '');

function resolveTopKParam(req: NextRequest): string {
    const raw = req.nextUrl.searchParams.get('top_k');
    if (raw) {
        const n = parseInt(raw, 10);
        if (!Number.isNaN(n) && n >= 1 && n <= 50) {
            return String(n);
        }
    }
    const env = process.env.REALIZEME_SIMILAR_TOP_K;
    if (env) {
        const n = parseInt(env, 10);
        if (!Number.isNaN(n) && n >= 1 && n <= 50) {
            return String(n);
        }
    }
    return '5';
}

async function proxyFindSimilar(file: File, topK: string) {
    const backendForm = new FormData();
    backendForm.append('file', file);

    const url = `${BACKEND_BASE_URL}/find-similar?top_k=${encodeURIComponent(topK)}`;
    const response = await fetch(url, {
        method: 'POST',
        body: backendForm,
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(
            `Backend error: ${response.status}${text ? ` — ${text.slice(0, 500)}` : ''}`
        );
    }

    return response.json() as Promise<{
        success?: boolean;
        message?: string;
        count?: number;
        products?: unknown[];
        framework?: string;
    }>;
}

export async function POST(req: NextRequest) {
    try {
        try {
            const decoded = await verifyBearerIdTokenFromRequest(req);
            console.info('Find-similar API authorized for uid:', decoded.uid);
        } catch (authError) {
            return NextResponse.json(
                {
                    error: 'Unauthorized',
                    details: authError instanceof Error ? authError.message : 'Invalid or missing token',
                },
                { status: 401 }
            );
        }

        const formData = await req.formData();
        const file = formData.get('file');

        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (!BACKEND_BASE_URL) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Backend not configured',
                    details:
                        'Set REALIZEME_BACKEND_URL in .env.local to your FastAPI URL (e.g. http://127.0.0.1:8000).',
                    products: [],
                    count: 0,
                },
                { status: 503 }
            );
        }

        const topK = resolveTopKParam(req);

        try {
            const proxied = await proxyFindSimilar(file, topK);
            const products = normalizeSimilarProductList(proxied.products);

            return NextResponse.json({
                success: proxied.success ?? true,
                message: proxied.message,
                count: products.length,
                products,
                framework: proxied.framework,
                mode: 'proxy' as const,
            });
        } catch (error) {
            console.error('Find similar proxy failed:', error);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Similarity search failed',
                    details: error instanceof Error ? error.message : 'Unknown error',
                    products: [],
                    count: 0,
                },
                { status: 502 }
            );
        }
    } catch (error) {
        console.error('Find similar API error:', error);
        return NextResponse.json(
            {
                error: 'Failed to find similar products',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
