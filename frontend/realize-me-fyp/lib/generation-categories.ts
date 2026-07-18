export type GenerationCategory = {
    id: string;
    label: string;
};

export const GENERATION_CATEGORIES: GenerationCategory[] = [
    { id: 't-shirt', label: 'T-Shirt' },
    { id: 'shirt', label: 'Shirt' },
    { id: 'blouse', label: 'Blouse' },
    { id: 'crop-top', label: 'Crop Top' },
    { id: 'tank-top', label: 'Tank Top' },
    { id: 'hoodie', label: 'Hoodie' },
    { id: 'sweatshirt', label: 'Sweatshirt' },
    { id: 'jacket', label: 'Jacket' },
    { id: 'coat', label: 'Coat' },
    { id: 'blazer', label: 'Blazer' },
    { id: 'dress', label: 'Dress' },
    { id: 'skirt', label: 'Skirt' },
    { id: 'trousers', label: 'Trousers' },
    { id: 'pants', label: 'Pants' },
    { id: 'jeans', label: 'Jeans' },
    { id: 'shorts', label: 'Shorts' },
    { id: 'jumpsuit', label: 'Jumpsuit' },
    { id: 'cardigan', label: 'Cardigan' },
    { id: 'sweater', label: 'Sweater' },
    { id: 'vest', label: 'Vest' },
    { id: 'other', label: 'Other' },
];

export const DEFAULT_GENERATION_CATEGORY_ID = 'garment';
export const DEFAULT_GARMENT_LABEL = 'Garment';

const OTHER_CATEGORY = GENERATION_CATEGORIES[GENERATION_CATEGORIES.length - 1];

export function getGenerationCategoryById(id: string): GenerationCategory | undefined {
    return GENERATION_CATEGORIES.find((category) => category.id === id);
}

/** Map template filter chips (`shirt`, `tank-tops`, …) to canonical generation ids. */
export function mapTemplateFilterCategoryToGenerationId(
    templateCategory: string
): string | undefined {
    const mapping: Record<string, string> = {
        shirt: 't-shirt',
        dress: 'dress',
        hoodie: 'hoodie',
        skirt: 'skirt',
        jackets: 'jacket',
        shorts: 'shorts',
        'tank-tops': 'tank-top',
        pants: 'jeans',
    };
    return mapping[templateCategory];
}

export function filterGenerationCategories(query: string): GenerationCategory[] {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
        return GENERATION_CATEGORIES;
    }

    const matches = GENERATION_CATEGORIES.filter(
        (category) =>
            category.id !== OTHER_CATEGORY.id &&
            category.label.toLowerCase().includes(trimmed)
    );

    return [...matches, OTHER_CATEGORY];
}

export function resolveGarmentLabelForCategoryId(categoryId: string): string {
    return getGenerationCategoryById(categoryId)?.label ?? DEFAULT_GARMENT_LABEL;
}
