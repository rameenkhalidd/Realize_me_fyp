/**
 * Normalizes FastAPI /find-similar product rows for the results UI.
 * Keeps field names aligned with `products` + `product_embeddings_fashion_clip` in Postgres.
 */
export interface SimilarProduct {
    product_id: string;
    name: string;
    brand: string;
    price: number;
    similarity: number;
    image_url: string;
    product_url: string;
}

export function normalizeSimilarProduct(raw: unknown): SimilarProduct | null {
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    const o = raw as Record<string, unknown>;
    if (o.product_id === undefined || o.product_id === null) {
        return null;
    }

    const priceNum = Number(o.price);
    const simNum = Number(o.similarity);

    return {
        product_id: String(o.product_id),
        name: typeof o.name === 'string' ? o.name : String(o.name ?? ''),
        brand: typeof o.brand === 'string' ? o.brand : String(o.brand ?? ''),
        price: Number.isFinite(priceNum) ? priceNum : 0,
        similarity: Number.isFinite(simNum) ? simNum : 0,
        image_url: typeof o.image_url === 'string' ? o.image_url.trim() : '',
        product_url: typeof o.product_url === 'string' ? o.product_url.trim() : '',
    };
}

export function normalizeSimilarProductList(products: unknown): SimilarProduct[] {
    if (!Array.isArray(products)) {
        return [];
    }
    return products.map(normalizeSimilarProduct).filter((p): p is SimilarProduct => p !== null);
}
