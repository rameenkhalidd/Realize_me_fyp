import type { Editor, TLDefaultColorStyle, TLShapeId } from 'tldraw';

import { COLOR_HINT_COLOR_TOKENS, isOutlineColor, OUTLINE_COLOR_TOKENS } from '@/lib/canvas-colors';

export { COLOR_HINT_COLOR_TOKENS, OUTLINE_COLOR_TOKENS };

const TL_COLOR_TOKENS = new Set<string>([
    ...OUTLINE_COLOR_TOKENS,
    ...COLOR_HINT_COLOR_TOKENS,
]);

function normalizeColorToken(value: unknown): TLDefaultColorStyle | null {
    if (typeof value !== 'string' || !TL_COLOR_TOKENS.has(value)) {
        return null;
    }
    return value as TLDefaultColorStyle;
}

/**
 * Read the stroke/fill color token stored on a shape.
 * Uses shape.props.color (tldraw default) with fallbacks for geo/line/draw.
 * Image imports → outline-only (sketch export).
 */
export function getShapeColorToken(editor: Editor, shapeId: TLShapeId): TLDefaultColorStyle | null {
    const shape = editor.getShape(shapeId);
    if (!shape) return null;

    if (shape.type === 'image') {
        return 'black';
    }

    const props = shape.props as Record<string, unknown>;
    const fromProps = normalizeColorToken(props.color);
    if (fromProps) {
        return fromProps;
    }

    return 'black';
}

export function partitionShapeIds(editor: Editor): {
    outlineIds: TLShapeId[];
    colorHintIds: TLShapeId[];
} {
    const outlineIds: TLShapeId[] = [];
    const colorHintIds: TLShapeId[] = [];

    for (const shapeId of editor.getCurrentPageShapeIds()) {
        const token = getShapeColorToken(editor, shapeId);
        if (!token || isOutlineColor(token)) {
            outlineIds.push(shapeId);
        } else {
            colorHintIds.push(shapeId);
        }
    }

    return { outlineIds, colorHintIds };
}

export function hasOutlineShapes(editor: Editor): boolean {
    return partitionShapeIds(editor).outlineIds.length > 0;
}

export function hasColorHintShapes(editor: Editor): boolean {
    return partitionShapeIds(editor).colorHintIds.length > 0;
}
