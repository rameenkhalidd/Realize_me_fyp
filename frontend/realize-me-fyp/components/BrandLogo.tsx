import Link from 'next/link';

export type BrandLogoProps = {
    /** Dark: white wordmark (nav, footer, auth gradient panel). Light: gray titles on pale headers. */
    theme?: 'dark' | 'light';
    subtitle?: string;
    className?: string;
    href?: string;
};

/** Shared mark + wordmark — matches landing navbar (violet → cyan tile, R, Raleway). */
export function BrandLogo({ theme = 'light', subtitle, className = '', href }: BrandLogoProps) {
    const titleClass = theme === 'dark' ? 'text-white' : 'text-[#1F2937]';
    const subtitleClass = theme === 'dark' ? 'text-white/80' : 'text-gray-500';

    const mark = (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-linear-to-br from-[#8B5CF6] to-[#06B6D4] font-bold font-raleway text-white">
            R
        </div>
    );

    const body = (
        <div className={`flex min-w-0 items-center gap-2 ${className}`}>
            {mark}
            <div className="min-w-0">
                <span className={`text-xl font-bold font-raleway ${titleClass}`}>RealizeMe</span>
                {subtitle ? <p className={`mt-0.5 text-xs ${subtitleClass}`}>{subtitle}</p> : null}
            </div>
        </div>
    );

    if (href) {
        return (
            <Link
                href={href}
                className="inline-flex min-w-0 shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:ring-offset-2"
            >
                {body}
            </Link>
        );
    }

    return body;
}
