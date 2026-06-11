'use client';

import { TEMPLATES } from './templates';

type Props = {
    onSelect: (src: string) => void;
    onClose: () => void;
};

export default function TemplatesPanel({ onSelect, onClose }: Props) {
    return (
        <div className="absolute right-16 top-6 z-50 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Templates</h3>
                <button onClick={onClose} className="text-xs text-gray-500">
                    Close
                </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
                {TEMPLATES.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => onSelect(t.src)}
                        className="group overflow-hidden rounded-lg border hover:border-violet-400"
                    >
                        <img
                            src={t.src}
                            alt={t.name}
                            className="h-24 w-full object-cover group-hover:scale-105 transition"
                        />
                        <p className="p-1 text-[11px] text-gray-600">{t.name}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}