'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { PenSquare } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { DesignerWorkspaceTabs } from '@/components/designer/DesignerWorkspaceTabs';
import { useAuth } from '@/components/auth/AuthProvider';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { RECOVER_SKETCH_STORAGE_KEY } from '@/lib/results-entry';
import { INTERACTIVE_BUTTON_MOTION } from '@/lib/interactive-button-motion';

type HistoryDetail = {
    id: number;
    sketch_json: unknown;
    generated_image_url: string;
    generation_timestamp: string | null;
    session_id: string | null;
    pix2pix_model_version: string;
};

type SearchRow = {
    product_id: string;
    product_name: string;
    brand: string;
    price: number | null;
    similarity_score: number;
    rank_position: number;
    image_url: string;
    product_url: string;
};

export default function HistoryDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = typeof params.id === 'string' ? params.id : '';
    const { user, loading } = useAuth();
    const [history, setHistory] = useState<HistoryDetail | null>(null);
    const [results, setResults] = useState<SearchRow[]>([]);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!isFirebaseConfigured() || !id) {
            return;
        }
        if (!loading && !user) {
            router.replace(`/login?next=/designer/history/${id}`);
            return;
        }
        if (!user) {
            return;
        }

        let cancelled = false;
        void (async () => {
            try {
                const token = await user.getIdToken();
                const r = await fetch(`/api/realize/history/${encodeURIComponent(id)}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const j = await r.json();
                if (!r.ok) {
                    const d = j.detail;
                    const msg = typeof d === 'string' ? d : Array.isArray(d) ? JSON.stringify(d) : j.error;
                    throw new Error(msg || 'Not found');
                }
                if (cancelled) {
                    return;
                }
                setHistory(j.history as HistoryDetail);
                setResults((j.search_results as SearchRow[]) || []);
            } catch (e) {
                if (!cancelled) {
                    setErr(e instanceof Error ? e.message : 'Failed to load');
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user, loading, id, router]);

    const continueSketch = () => {
        if (!history?.sketch_json || typeof history.sketch_json !== 'object') {
            return;
        }
        try {
            sessionStorage.setItem(RECOVER_SKETCH_STORAGE_KEY, JSON.stringify(history.sketch_json));
            router.push('/designer');
        } catch (e) {
            console.error(e);
            alert('Could not copy sketch to session storage (too large?).');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 font-roboto">
            <header className="border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
                <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                        <BrandLogo theme="light" subtitle={`Generation #${id}`} />
                        <DesignerWorkspaceTabs />
                    </div>
                    <Link
                        href="/designer/history"
                        className={`shrink-0 text-sm font-medium text-violet-700 hover:underline ${INTERACTIVE_BUTTON_MOTION}`}
                    >
                        ← All generations
                    </Link>
                </div>
            </header>

            <main className="mx-auto max-w-5xl px-6 py-10">
                {err ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p>
                ) : null}

                {history ? (
                    <>
                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={continueSketch}
                                className={`inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-realize-gradient-fuchsia px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ${INTERACTIVE_BUTTON_MOTION}`}
                            >
                                <PenSquare className="h-4 w-4" />
                                Open sketch on canvas
                            </button>
                        </div>

                        <div className="mt-8 grid gap-8 md:grid-cols-2">
                            <div>
                                <h2 className="font-raleway text-lg font-bold text-slate-800">Generated render</h2>
                                <p className="text-xs text-slate-500">
                                    {history.generation_timestamp
                                        ? new Date(history.generation_timestamp).toLocaleString()
                                        : ''}{' '}
                                    · {history.pix2pix_model_version}
                                </p>
                                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                    {history.generated_image_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={history.generated_image_url}
                                            alt="Generated"
                                            className="max-h-[480px] w-full object-contain"
                                        />
                                    ) : (
                                        <p className="p-6 text-sm text-slate-500">No image URL stored.</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h2 className="font-raleway text-lg font-bold text-slate-800">Saved similar products</h2>
                                <p className="text-xs text-slate-500">{results.length} items</p>
                                <ul className="mt-3 space-y-3">
                                    {results.map((r) => (
                                        <li
                                            key={`${r.product_id}-${r.rank_position}`}
                                            className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm"
                                        >
                                            {r.image_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={r.image_url}
                                                    alt=""
                                                    className="h-16 w-16 shrink-0 rounded object-cover"
                                                />
                                            ) : null}
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-slate-800">{r.product_name}</p>
                                                <p className="text-xs text-slate-500">{r.brand}</p>
                                                <p className="text-xs text-violet-700">
                                                    Match {(r.similarity_score * 100).toFixed(1)}% · #{r.rank_position}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                {results.length === 0 ? (
                                    <p className="mt-4 text-sm text-slate-500">No search results were saved for this run.</p>
                                ) : null}
                            </div>
                        </div>
                    </>
                ) : !err ? (
                    <p className="text-slate-600">Loading…</p>
                ) : null}
            </main>
        </div>
    );
}
