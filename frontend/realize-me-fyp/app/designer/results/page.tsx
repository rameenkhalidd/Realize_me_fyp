'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Info, Loader, ShoppingBag } from 'lucide-react';
import { ResultsEntryBanner } from '@/components/designer/ResultsEntryBanner';
import { INTERACTIVE_BUTTON_MOTION } from '@/lib/interactive-button-motion';
import { HISTORY_ID_STORAGE_KEY, RESULTS_ENTRY_WELCOME_KEY } from '@/lib/results-entry';
import { useAuth } from '@/components/auth/AuthProvider';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { hasClientAuthSession, isAuthRequired, shouldSkipDesignerAuthInDevelopment } from '@/lib/auth-flags';
import { getDesignerLoginHref } from '@/lib/designer-auth-redirect';
import { getFirebaseAuth } from '@/lib/firebase/client-app';

const SIMILAR_TOP_K = process.env.NEXT_PUBLIC_SIMILAR_TOP_K || '5';

interface Product {
    product_id: string;
    name: string;
    brand: string;
    price: number;
    similarity: number;
    image_url: string;
    product_url: string;
}

const SESSION_EXPIRED_MESSAGE = 'Your session expired. Please sign in again.';

function isUsableProductUrl(url: string | undefined | null): boolean {
    if (!url?.trim()) {
        return false;
    }
    const trimmed = url.trim();
    if (trimmed === '#' || trimmed.startsWith('#')) {
        return false;
    }
    try {
        const parsed = new URL(trimmed);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

function ResultsPageContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useAuth();

    const canAccessResultsPage = useMemo(() => {
        if (shouldSkipDesignerAuthInDevelopment()) {
            return true;
        }
        if (isFirebaseConfigured()) {
            return !authLoading && !!user;
        }
        if (isAuthRequired()) {
            return hasClientAuthSession();
        }
        return true;
    }, [authLoading, user]);

    useEffect(() => {
        if (shouldSkipDesignerAuthInDevelopment()) {
            return;
        }
        if (isFirebaseConfigured()) {
            if (!authLoading && !user) {
                router.replace(getDesignerLoginHref(pathname, searchParams));
            }
            return;
        }
        if (isAuthRequired() && !hasClientAuthSession()) {
            router.replace(getDesignerLoginHref(pathname, searchParams));
        }
    }, [authLoading, user, router, pathname, searchParams]);

    const [sketchImage, setSketchImage] = useState('');
    const [generatedImage, setGeneratedImage] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [notice, setNotice] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [showEntryWelcome, setShowEntryWelcome] = useState(false);

    const dismissEntryWelcome = useCallback(() => {
        setShowEntryWelcome(false);
    }, []);

    useEffect(() => {
        if (!canAccessResultsPage) {
            return;
        }

        const sketch = sessionStorage.getItem('realizeme:sketchImage');
        const generated = sessionStorage.getItem('realizeme:generatedImage');
        const generateNotice = sessionStorage.getItem('realizeme:generateNotice');

        if (!sketch || !generated) {
            router.push('/designer');
            return;
        }

        setSketchImage(sketch);
        setGeneratedImage(generated);
        setNotice(generateNotice || '');

        if (sessionStorage.getItem(RESULTS_ENTRY_WELCOME_KEY) === '1') {
            sessionStorage.removeItem(RESULTS_ENTRY_WELCOME_KEY);
            setShowEntryWelcome(true);
        }

        setIsLoading(false);
    }, [router, canAccessResultsPage]);

    const handleFindSimilar = async () => {
        if (!generatedImage || isSearching) {
            return;
        }

        setIsSearching(true);

        try {
            const base64Data = generatedImage.split(',')[1];

            if (!base64Data) {
                throw new Error('Generated image is not available for similarity search');
            }

            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);

            for (let i = 0; i < binaryString.length; i += 1) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const formData = new FormData();
            formData.append('file', new Blob([bytes], { type: 'image/png' }), 'generated.png');

            const auth = getFirebaseAuth();
            const currentUser = auth?.currentUser;
            if (!currentUser) {
                throw new Error(SESSION_EXPIRED_MESSAGE);
            }

            let idToken: string;
            try {
                idToken = await currentUser.getIdToken();
            } catch {
                throw new Error(SESSION_EXPIRED_MESSAGE);
            }

            const similarUrl = `/api/find-similar?top_k=${encodeURIComponent(SIMILAR_TOP_K)}`;
            const response = await fetch(similarUrl, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${idToken}`,
                },
                body: formData,
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                if (response.status === 401) {
                    throw new Error(SESSION_EXPIRED_MESSAGE);
                }
                throw new Error(data.error || data.details || 'Failed to find similar products');
            }

            const productList = Array.isArray(data.products) ? data.products : [];
            setProducts(productList);
            setHasSearched(true);

            const hid = sessionStorage.getItem(HISTORY_ID_STORAGE_KEY);
            if (hid && productList.length > 0) {
                try {
                    await fetch('/api/realize/search-results', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${idToken}`,
                        },
                        body: JSON.stringify({
                            history_id: parseInt(hid, 10),
                            products: (productList as Product[]).map((p) => ({
                                product_id: p.product_id,
                                similarity: p.similarity,
                            })),
                        }),
                    });
                } catch (persistErr) {
                    console.warn('Could not persist search results:', persistErr);
                }
            }

            if (data.message) {
                setNotice(data.message);
            }
        } catch (error) {
            console.error('Error finding similar products:', error);
            alert(error instanceof Error ? error.message : 'Error finding similar products');
        } finally {
            setIsSearching(false);
        }
    };

    const downloadImage = (dataUrl: string, filename: string) => {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadBoth = () => {
        downloadImage(sketchImage, 'my-sketch.png');
        setTimeout(() => downloadImage(generatedImage, 'ai-generated-design.png'), 100);
    };

    const handleStartOver = () => {
        sessionStorage.removeItem('realizeme:sketchImage');
        sessionStorage.removeItem('realizeme:generatedImage');
        sessionStorage.removeItem('realizeme:sketchSnapshot');
        sessionStorage.removeItem('realizeme:generateNotice');
        sessionStorage.removeItem(HISTORY_ID_STORAGE_KEY);
        sessionStorage.removeItem(RESULTS_ENTRY_WELCOME_KEY);
        router.push('/designer');
    };

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-realize text-realize font-roboto">
                <div className="w-full max-w-3xl px-6">
                    <div className="mb-6 text-center">
                        <p className="text-gray-600 font-medium">Preparing your comparison…</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="rounded-2xl border border-realize bg-white p-6 shadow-realize-xl">
                            <div className="mb-4 h-8 w-40 animate-pulse rounded-md bg-gray-200" />
                            <div className="h-72 w-full animate-pulse rounded-xl bg-gray-200" />
                            <div className="mt-4 h-10 w-full animate-pulse rounded-lg bg-gray-200" />
                        </div>
                        <div className="rounded-2xl border border-realize bg-white p-6 shadow-realize-xl">
                            <div className="mb-4 h-8 w-40 animate-pulse rounded-md bg-gray-200" />
                            <div className="h-72 w-full animate-pulse rounded-xl bg-gray-200" />
                            <div className="mt-4 h-10 w-full animate-pulse rounded-lg bg-gray-200" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-realize text-realize font-roboto">
            <main className="mx-auto max-w-7xl px-6 py-8 md:py-10">
                <h1 className="sr-only">Design comparison</h1>

                {showEntryWelcome && <ResultsEntryBanner onDismiss={dismissEntryWelcome} />}

                {notice && (
                    <div className="mb-8 rounded-2xl border border-purple-200 bg-purple-50 px-5 py-4 text-left text-sm text-purple-900 shadow-sm">
                        <div className="flex items-start gap-3">
                            <Info className="mt-0.5 h-5 w-5 shrink-0" />
                            <p>{notice}</p>
                        </div>
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    <div className="bg-white rounded-2xl shadow-realize-xl border border-realize overflow-hidden">
                        <div className="bg-realize-gradient-fuchsia border-b border-violet-200/50 p-6">
                            <h2 className="font-raleway text-2xl font-bold text-slate-800">Your sketch</h2>
                            <p className="mt-0.5 font-roboto text-sm text-slate-600">Original artwork</p>
                        </div>

                        <div className="p-6">
                            <div className="bg-gray-50 rounded-xl p-6 min-h-[400px] flex items-center justify-center border border-realize">
                                {sketchImage ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={sketchImage}
                                        className="max-w-full max-h-[500px] object-contain"
                                        alt="Your sketch"
                                    />
                                ) : (
                                    <p className="text-gray-400">No sketch available</p>
                                )}
                            </div>

                            <button
                                onClick={() => downloadImage(sketchImage, 'my-sketch.png')}
                                className={`w-full mt-6 rounded-lg border border-violet-200/70 bg-realize-gradient-fuchsia px-6 py-3 font-roboto font-semibold text-slate-900 shadow-md ${INTERACTIVE_BUTTON_MOTION}`}
                            >
                                Download sketch
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-realize-xl border border-realize overflow-hidden">
                        <div className="bg-realize-gradient-fuchsia border-b border-violet-200/50 p-6">
                            <h2 className="font-raleway text-2xl font-bold text-slate-800">Generated Image</h2>
                            <p className="mt-0.5 font-roboto text-sm text-slate-600">Model generated output</p>
                        </div>

                        <div className="p-6">
                            <div className="bg-gray-50 rounded-xl p-6 min-h-[400px] flex items-center justify-center border border-realize">
                                {generatedImage ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={generatedImage}
                                        className="max-w-full max-h-[500px] object-contain rounded-lg shadow-md"
                                        alt="AI generated"
                                    />
                                ) : (
                                    <p className="text-gray-400">Generating...</p>
                                )}
                            </div>

                            <button
                                onClick={() => downloadImage(generatedImage, 'ai-generated-design.png')}
                                className={`w-full mt-6 rounded-lg border border-violet-200/70 bg-realize-gradient-fuchsia px-6 py-3 font-roboto font-semibold text-slate-900 shadow-md ${INTERACTIVE_BUTTON_MOTION}`}
                            >
                                Download render
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 justify-center mt-12 mb-12">
                    <button
                        onClick={handleDownloadBoth}
                        className={`px-8 py-4 bg-gray-900 text-white rounded-xl shadow-realize-xl hover:bg-gray-800 font-semibold flex items-center justify-center gap-2 ${INTERACTIVE_BUTTON_MOTION}`}
                    >
                        Download both
                    </button>

                    <button
                        onClick={handleFindSimilar}
                        disabled={isSearching}
                        className={`px-8 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md ${INTERACTIVE_BUTTON_MOTION} ${isSearching
                            ? 'cursor-not-allowed bg-gray-300 text-gray-500 shadow-none'
                            : 'border border-violet-200/70 bg-realize-gradient-fuchsia text-slate-900'
                            }`}
                    >
                        {isSearching ? (
                            <>
                                <Loader size={20} className="animate-spin" />
                                Searching…
                            </>
                        ) : (
                            <>
                                <ShoppingBag size={20} />
                                Find similar pieces
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleStartOver}
                        className={`px-8 py-4 bg-white text-gray-700 border border-realize rounded-xl shadow-md hover:bg-gray-50 font-semibold flex items-center justify-center gap-2 ${INTERACTIVE_BUTTON_MOTION}`}
                    >
                        Start a new design
                    </button>
                </div>

                {hasSearched && (
                    <div>
                        <h2 className="text-3xl font-bold font-raleway text-realize mb-8 text-center">
                            Similar pieces
                        </h2>

                        {products.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500 text-lg">
                                    No close matches yet. Try again later or adjust your render.
                                </p>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-6">
                                {products.map((product, idx) => (
                                    <div
                                        key={product.product_id}
                                        className="relative bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-realize overflow-hidden"
                                    >
                                        <div className="absolute top-3 left-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-violet-200/60 bg-realize-gradient-fuchsia text-sm font-bold text-slate-800 shadow-sm">
                                            {idx + 1}
                                        </div>

                                        <div className="relative h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
                                            {product.image_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <p className="text-gray-400">Image unavailable</p>
                                            )}
                                        </div>

                                        <div className="p-4">
                                            <div className="mb-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-semibold text-gray-600">Match</span>
                                                    <span className="text-sm font-bold text-purple-600">
                                                        {(product.similarity * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="h-2 rounded-full bg-realize-gradient-fuchsia transition-all"
                                                        style={{ width: `${product.similarity * 100}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1">
                                                {product.name}
                                            </h3>

                                            <p className="text-xs text-gray-500 mb-3">{product.brand}</p>

                                            <p className="text-lg font-bold text-gray-900 mb-4">
                                                ${product.price?.toFixed(2) || 'N/A'}
                                            </p>

                                            {isUsableProductUrl(product.product_url) ? (
                                                <a
                                                    href={product.product_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block w-full rounded-lg border border-violet-200/70 bg-realize-gradient-fuchsia px-4 py-2 text-center text-sm font-semibold text-slate-900 shadow-sm transition-opacity hover:opacity-95"
                                                >
                                                    View Product
                                                </a>
                                            ) : (
                                                <p
                                                    className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-center text-sm font-medium text-gray-500"
                                                    role="status"
                                                >
                                                    Product link unavailable
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

function ResultsPageFallback() {
    return (
        <div className="flex h-screen items-center justify-center bg-realize font-roboto">
            <p className="text-sm text-gray-600">Loading…</p>
        </div>
    );
}

export default function ResultsPage() {
    return (
        <Suspense fallback={<ResultsPageFallback />}>
            <ResultsPageContent />
        </Suspense>
    );
}
