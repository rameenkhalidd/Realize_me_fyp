'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ImageIcon } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { INTERACTIVE_BUTTON_MOTION } from '@/lib/interactive-button-motion';

type HistoryItem = {
    id: number;
    generated_image_url: string;
    generation_timestamp: string | null;
    session_id: string | null;
    pix2pix_model_version: string;
};

export default function DesignerHistoryListPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [items, setItems] = useState<HistoryItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [err, setErr] = useState<string | null>(null);
    const limit = 20;

    useEffect(() => {
        if (!isFirebaseConfigured()) {
            router.replace('/designer');
            return;
        }
        if (!loading && !user) {
            router.replace('/login?next=/designer/history');
            return;
        }
        if (!user) {
            return;
        }

        let cancelled = false;
        void (async () => {
            setErr(null);
            try {
                const token = await user.getIdToken();
                const offset = page * limit;
                const r = await fetch(`/api/realize/history?limit=${limit}&offset=${offset}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const j = await r.json();
                if (!r.ok) {
                    throw new Error(j.details || j.error || 'Failed to load history');
                }
                if (cancelled) {
                    return;
                }
                const chunk = (j.items as HistoryItem[]) || [];
                setTotal(typeof j.total === 'number' ? j.total : 0);
                if (page === 0) {
                    setItems(chunk);
                } else {
                    setItems((prev) => [...prev, ...chunk]);
                }
            } catch (e) {
                if (!cancelled) {
                    setErr(e instanceof Error ? e.message : 'Failed to load');
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user, loading, router, page]);

    const canLoadMore = items.length < total;

    return (
        <main className="mx-auto max-w-4xl flex-1 px-6 py-10">
            <h1 className="font-raleway text-2xl font-bold text-slate-800">Your generations</h1>
            <p className="mt-1 text-sm text-slate-600">
                Renders and saved searches from your account ({total} total). Use the sidebar to return to{' '}
                <span className="font-medium text-violet-700">Design</span> and keep sketching.
            </p>

            {err ? (
                <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {err}
                </p>
            ) : null}

            <ul className="mt-8 space-y-4">
                {items.map((h) => (
                    <li key={h.id}>
                        <Link
                            href={`/designer/history/${h.id}`}
                            className={`flex gap-4 rounded-xl border border-violet-200/70 bg-white p-4 shadow-sm transition hover:border-violet-300 hover:shadow-md ${INTERACTIVE_BUTTON_MOTION}`}
                        >
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                                {h.generated_image_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={h.generated_image_url}
                                        alt=""
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <ImageIcon className="h-8 w-8 text-slate-400" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-slate-800">Generation #{h.id}</p>
                                <p className="text-xs text-slate-500">
                                    {h.generation_timestamp
                                        ? new Date(h.generation_timestamp).toLocaleString()
                                        : '—'}
                                </p>
                                <p className="mt-1 text-[11px] text-slate-500">
                                    Model: {h.pix2pix_model_version || 'scribbler-v2'}
                                    {h.session_id ? ` · Session ${h.session_id.slice(0, 8)}` : ''}
                                </p>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>

            {items.length === 0 && !err && user ? (
                <p className="mt-10 text-center text-slate-500">No generations yet.</p>
            ) : null}

            {canLoadMore ? (
                <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    className={`mt-8 w-full rounded-xl border border-violet-200 bg-white py-3 text-sm font-semibold text-violet-800 ${INTERACTIVE_BUTTON_MOTION}`}
                >
                    Load more
                </button>
            ) : null}
        </main>
    );
}
