const STORAGE_KEY = 'realizeme:designerRailExpanded';

/** Collapsed by default; expanded only when localStorage is explicitly `"true"`. */
export function readDesignerRailExpanded(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }
    try {
        return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
}

export function writeDesignerRailExpanded(expanded: boolean): void {
    try {
        localStorage.setItem(STORAGE_KEY, String(expanded));
    } catch {
        // ignore quota / private mode
    }
}
