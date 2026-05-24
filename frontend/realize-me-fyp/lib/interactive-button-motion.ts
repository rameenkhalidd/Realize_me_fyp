/**
 * Subtle hover lift + press feedback for app chrome buttons.
 * Do not use on tldraw toolbars, style panel, canvas chrome, or file menu — those need snappy, predictable hit targets.
 * Respects `prefers-reduced-motion` via Tailwind `motion-safe` / `motion-reduce`.
 */
export const INTERACTIVE_BUTTON_MOTION =
    'transition-[transform,box-shadow,opacity,background-color,border-color,color] duration-200 ease-out ' +
    'enabled:motion-safe:hover:-translate-y-0.5 enabled:motion-safe:active:translate-y-0 enabled:motion-safe:active:scale-[0.98] ' +
    'motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 ' +
    'disabled:motion-safe:hover:translate-y-0 disabled:motion-safe:active:scale-100';
