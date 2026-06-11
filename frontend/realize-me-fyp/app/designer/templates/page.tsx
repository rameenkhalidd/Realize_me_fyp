'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { TEMPLATES, type TemplateItem } from '@/components/designer/templates';

const CATEGORIES = ['all', 'shirt', 'hoodie', 'dress', 'jackets', 'pants', 'shorts', 'skirt', 'tank-tops'] as const;

export default function TemplatesPage() {
    const router = useRouter();
    const [selected, setSelected] = useState<TemplateItem | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('all');

    const filtered = activeCategory === 'all'
        ? TEMPLATES
        : TEMPLATES.filter(t => t.category === activeCategory);

    const handleEdit = () => {
        if (!selected) return;
        sessionStorage.setItem('realizeme:pendingTemplate', JSON.stringify({
            src: selected.src,
            name: selected.name,
        }));
        router.push('/designer');
    };

    return (
        <div
            className="flex h-full flex-col overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #f5f0ff 0%, #fdf4ff 40%, #f0f9ff 100%)' }}
            onClick={() => setSelected(null)}
        >
            {/* Header */}
            <div className="shrink-0 border-b border-purple-100 bg-white/70 px-6 py-5 backdrop-blur-sm">
                <h1 className="font-raleway text-xl font-bold text-gray-900">Templates</h1>
                <p className="mt-0.5 text-xs text-gray-500">
                    Pick a base design — you'll draw over it on the canvas
                </p>
            </div>

            {/* Category Pills */}
            <div
                className="flex shrink-0 gap-2 overflow-x-auto border-b border-purple-100 bg-white/60 px-6 py-3 backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
            >
                {CATEGORIES.map(cat => (
                    <button
                        key={cat}
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveCategory(cat);
                        }}
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors font-roboto ${
                            activeCategory === cat
                                ? 'text-white shadow-sm'
                                : 'bg-white/80 text-gray-500 border border-purple-100 hover:bg-purple-50 hover:text-purple-600'
                        }`}
                        style={activeCategory === cat ? {
                            background: 'linear-gradient(to right, #a78bfa, #c084fc, #67e8f9)',
                        } : undefined}
                    >
                        {cat === 'all' ? 'All' : cat}
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filtered.map((t) => {
                        const isSelected = selected?.id === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelected(isSelected ? null : t);
                                }}
                                className={`group relative overflow-hidden rounded-2xl border bg-white/80 p-3 text-left transition-all shadow-sm hover:shadow-md backdrop-blur-sm ${
                                    isSelected
                                        ? 'border-purple-300 ring-2 ring-purple-200/60'
                                        : 'border-purple-100 hover:border-purple-300'
                                }`}
                            >
                                {isSelected && (
                                    <div
                                        className="absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full text-white text-[10px] font-bold shadow-sm"
                                        style={{ background: 'linear-gradient(to right, #a78bfa, #c084fc)' }}
                                    >
                                        ✓
                                    </div>
                                )}

                                <div className={`relative h-48 w-full overflow-hidden rounded-xl transition-colors ${
                                    isSelected ? 'bg-purple-50/80' : 'bg-gray-50/80 group-hover:bg-purple-50/50'
                                }`}>
                                    <Image
                                        src={t.src}
                                        alt={t.name}
                                        fill
                                        className="object-contain p-2 transition-transform group-hover:scale-105"
                                    />
                                </div>

                                <p className="mt-2 text-sm font-semibold text-gray-800 font-raleway">{t.name}</p>
                                <p className="text-[11px] text-gray-400 capitalize font-roboto">{t.category}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Bottom bar */}
            {selected && (
                <div
                    className="shrink-0 border-t border-purple-100 bg-white/80 px-6 py-3 flex items-center justify-between backdrop-blur-sm shadow-[0_-2px_12px_rgba(139,92,246,0.06)]"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-purple-50 border border-purple-100">
                            <Image
                                src={selected.src}
                                alt={selected.name}
                                fill
                                className="object-contain p-1"
                            />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-900 font-raleway">{selected.name}</p>
                            <p className="text-[11px] text-gray-400 font-roboto">Will be placed as a tracing guide on canvas</p>
                        </div>
                    </div>
                    <button
                        onClick={handleEdit}
                        className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 shadow-sm font-roboto"
                        style={{ background: 'linear-gradient(to right, #a78bfa, #c084fc, #67e8f9)' }}
                    >
                        Edit on Canvas →
                    </button>
                </div>
            )}
        </div>
    );
}