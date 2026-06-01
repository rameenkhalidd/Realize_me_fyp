import type { TLDefaultColorStyle } from 'tldraw';

/** Shared palette — used by style panel and export classification. */
export const CANVAS_PALETTE_COLORS: Array<{ name: TLDefaultColorStyle; hex: string }> = [
    { name: 'black', hex: '#1d1d1d' },
    { name: 'grey', hex: '#adb5bd' },
    { name: 'light-violet', hex: '#e9d5ff' },
    { name: 'violet', hex: '#8b5cf6' },
    { name: 'blue', hex: '#3b82f6' },
    { name: 'light-blue', hex: '#0ea5e9' },
    { name: 'yellow', hex: '#fbbf24' },
    { name: 'orange', hex: '#f97316' },
    { name: 'green', hex: '#10b981' },
    { name: 'light-green', hex: '#84cc16' },
    { name: 'light-red', hex: '#fb7185' },
    { name: 'red', hex: '#ef4444' },
];

export const OUTLINE_COLOR_TOKENS = ['black', 'grey'] as const satisfies readonly TLDefaultColorStyle[];

export const COLOR_HINT_COLOR_TOKENS = CANVAS_PALETTE_COLORS.map((c) => c.name).filter(
    (name): name is TLDefaultColorStyle =>
        !(OUTLINE_COLOR_TOKENS as readonly string[]).includes(name)
);

const OUTLINE_SET = new Set<string>(OUTLINE_COLOR_TOKENS);

export function isOutlineColor(token: string | null | undefined): boolean {
    if (!token) return true;
    return OUTLINE_SET.has(token);
}

export function hexToRgb(hex: string) {
    const clean = hex.replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
    return {
        r: Number.parseInt(clean.slice(0, 2), 16),
        g: Number.parseInt(clean.slice(2, 4), 16),
        b: Number.parseInt(clean.slice(4, 6), 16),
    };
}

export function getNearestColorToken(hex: string): TLDefaultColorStyle {
    const rgb = hexToRgb(hex);
    if (!rgb) return 'black';

    let nearest: TLDefaultColorStyle = CANVAS_PALETTE_COLORS[0].name;
    let minDistance = Number.POSITIVE_INFINITY;

    for (const color of CANVAS_PALETTE_COLORS) {
        const target = hexToRgb(color.hex);
        if (!target) continue;
        const distance =
            (rgb.r - target.r) ** 2 + (rgb.g - target.g) ** 2 + (rgb.b - target.b) ** 2;
        if (distance < minDistance) {
            minDistance = distance;
            nearest = color.name;
        }
    }

    return nearest;
}
