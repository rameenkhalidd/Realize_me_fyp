export type TemplateItem = {
    id: string;
    name: string;
    src: string;
    category: 'shirt' | 'dress' | 'hoodie' | 'skirt' | 'jackets' | 'shorts' | 'tank-tops' | 'pants';
};

export const TEMPLATES: TemplateItem[] = [
    { id: 'basic-tshirt-1', name: 'Basic Round neck T-Shirt', src: '/templates/shirt1.png', category: 'shirt' },
    { id: 'basic-tshirt-2', name: 'Basic V-neck T-Shirt', src: '/templates/shirt2.png', category: 'shirt' },
    { id: 'basic-tshirt-3', name: 'Basic collared T-Shirt', src: '/templates/shirt3.png', category: 'shirt' },
    { id: 'hoodie-1', name: 'Hoodie Template 1', src: '/templates/hoodie1.png', category: 'hoodie' },
    { id: 'hoodie-2', name: 'Hoodie Template 2', src: '/templates/hoodie2.png', category: 'hoodie' },
    { id: 'hoodie-3', name: 'Hoodie Template 3', src: '/templates/hoodie3.png', category: 'hoodie' },
    { id: 'dress-1', name: 'A-line Dress', src: '/templates/dress1.png', category: 'dress' },
    { id: 'dress-2', name: 'Basic Dress', src: '/templates/dress2.png', category: 'dress' },
    { id: 'dress-3', name: 'Flared Dress', src: '/templates/dress3.png', category: 'dress' },
    { id: 'jacket-1', name: 'Puffer Jacket', src: '/templates/jacket1.png', category: 'jackets' },
    { id: 'jacket-2', name: 'Hoodie Jacket', src: '/templates/jacket2.png', category: 'jackets' },
    { id: 'jacket-3', name: 'Denim Jacket', src: '/templates/jacket3.png', category: 'jackets' },
    { id: 'jean-1', name: 'Dress Jeans', src: '/templates/jeans1.png', category: 'pants' },
    { id: 'jean-2', name: 'Basic Jeans', src: '/templates/jeans2.png', category: 'pants' },
    { id: 'short-1', name: 'Basic Shorts', src: '/templates/short1.png', category: 'shorts' },
    { id: 'short-2', name: 'Denim Shorts', src: '/templates/short2.png', category: 'shorts' },
    { id: 'skirt-1', name: 'Basic Skirt', src: '/templates/skirt1.png', category: 'skirt' },
    { id: 'skirt-2', name: 'Box Skirt', src: '/templates/skirt2.png', category: 'skirt' },
    { id: 'skirt-3', name: 'Pleated Skirt', src: '/templates/skirt3.png', category: 'skirt' },
    { id: 'tank-top-1', name: 'Tank Top 1', src: '/templates/tank-top1.png', category: 'tank-tops' },
    { id: 'tank-top-2', name: 'Tank Top 2', src: '/templates/tank-top2.png', category: 'tank-tops' },
    { id: 'tank-top-3', name: 'Tank Top 3', src: '/templates/tank-top3.png', category: 'tank-tops' },
];