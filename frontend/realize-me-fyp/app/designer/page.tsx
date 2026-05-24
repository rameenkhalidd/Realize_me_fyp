'use client';

import DesignerCanvas from '@/components/tldraw/DesignerCanvas';
import CanvasGuidePanel from "@/components/designer/CanvasGuidePanel";
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ButtonHTMLAttributes, type ReactNode, useEffect, useState, Suspense } from 'react';
import { PanelLeft, PenSquare, Search, Settings, Menu, LogOut } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { hasClientAuthSession, isAuthRequired, shouldSkipDesignerAuthInDevelopment } from '@/lib/auth-flags';
import { BrandLogo } from '@/components/BrandLogo';
import { INTERACTIVE_BUTTON_MOTION } from '@/lib/interactive-button-motion';
import { useAuth } from '@/components/auth/AuthProvider';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { getDesignerLoginHref } from '@/lib/designer-auth-redirect';
import { DesignerWorkspaceTabs } from '@/components/designer/DesignerWorkspaceTabs';

// --- 1. Helper Button Component ---
type ButtonVariant = 'default' | 'ghostDark';
type ButtonSize = 'default' | 'icon';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
    children: ReactNode;
};

const Button = ({
    variant = 'default',
    size = 'default',
    className = '',
    children,
    ...props
}: ButtonProps) => {
    const baseStyles = `inline-flex items-center justify-center rounded-md text-sm font-medium ${INTERACTIVE_BUTTON_MOTION} focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 font-roboto`;

    const variants: Record<ButtonVariant, string> = {
        default: "bg-purple-600 text-white hover:bg-purple-700", // Standardized to Global Theme
        ghostDark: "hover:bg-gray-800 text-gray-400 hover:text-white",
    };

    const sizes: Record<ButtonSize, string> = {
        default: "h-10 px-4 py-2",
        icon: "h-9 w-9 rounded-md",
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

function DesignerPageInner() {
    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const reduceMotion = useReducedMotion();
    const { user, loading: authLoading, signOut, configured: firebaseConfigured } = useAuth();

    useEffect(() => {
        if (shouldSkipDesignerAuthInDevelopment()) {
            return;
        }
        if (isFirebaseConfigured()) {
            if (!authLoading && !user) {
                router.replace(getDesignerLoginHref(pathname, searchParams));
            }
            return;
        }
        if (isAuthRequired() && !hasClientAuthSession()) {
            router.replace('/login?next=/designer');
        }
    }, [router, pathname, searchParams, authLoading, user]);

    const handleSignOut = async () => {
        try {
            await signOut();
        } finally {
            router.replace('/login');
        }
    };

    const accountLabel = user?.email ?? user?.displayName ?? null;

    return (
        // Applied Global Gradient Theme
        <div className="flex h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 overflow-hidden font-roboto">

            {/* --- 2. COLLAPSIBLE LEFT SIDEBAR --- */}
            <aside
                className={`
                    /* Mobile: Fixed overlay */
                    fixed inset-y-0 left-0 top-0 bottom-0 z-30
                    
                    /* Desktop: Relative flow */
                    md:relative md:top-auto md:bottom-auto
                    
                    /* Base styling */
                    w-14 bg-[#0F1115] border-r border-gray-800 flex flex-col items-center py-4 gap-4 
                    
                    /* Animation */
                    transition-all duration-300 ease-in-out
                    
                    /* THE FIX: overflow-hidden ensures icons don't spill out when width is 0 */
                    overflow-hidden
                    
                    /* Collapse Logic */
                    ${isLeftSidebarOpen ? 'translate-x-0' : '-translate-x-full md:w-0 md:border-none'}
                `}
            >
                {/* Inner Container: Fixed width prevents icon squashing */}
                <div className="w-14 flex flex-col items-center gap-4">

                    <Button variant="ghostDark" size="icon" title="Close Sidebar" onClick={() => setIsLeftSidebarOpen(false)}>
                        <PanelLeft className="w-5 h-5" />
                    </Button>

                    <div className="w-8 h-px bg-gray-800 my-1" />

                    <Button variant="ghostDark" size="icon" title="New Pad"><PenSquare className="w-5 h-5" /></Button>
                    <Button variant="ghostDark" size="icon" title="Search"><Search className="w-5 h-5" /></Button>

                    <div className="mt-auto w-8 h-px bg-gray-800 my-1" />
                    <Button variant="ghostDark" size="icon" title="Settings"><Settings className="w-5 h-5" /></Button>
                </div>
            </aside>

            {/* --- 3. FLOATING OPEN BUTTON --- */}
            {!isLeftSidebarOpen && (
                <button
                    onClick={() => setIsLeftSidebarOpen(true)}
                    className={`fixed left-4 top-24 z-20 bg-white border border-gray-300 rounded-lg p-2 shadow-lg hover:bg-gray-50 ${INTERACTIVE_BUTTON_MOTION}`}
                    title="Open Sidebar"
                >
                    <Menu className="w-5 h-5 text-gray-700" />
                </button>
            )}

            {/* --- 4. MAIN CONTENT --- */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Top bar: flex layout only (not position:sticky) */}
                <motion.header
                    initial={reduceMotion ? false : { opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                        reduceMotion
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 320, damping: 32 }
                    }
                    className="shrink-0 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 bg-white/80 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-4"
                >
                    <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                        <motion.div
                            className="flex shrink-0 items-center"
                            whileHover={reduceMotion ? undefined : { x: 2 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                        >
                            <BrandLogo theme="light" subtitle="Design Canvas" />
                        </motion.div>
                        <div className="flex min-w-0 flex-1 justify-start sm:justify-center">
                            <DesignerWorkspaceTabs />
                        </div>
                    </div>
                    <motion.div
                        className="flex items-center gap-4"
                        whileHover={reduceMotion ? undefined : { x: -2 }}
                        whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                    >
                        {firebaseConfigured && accountLabel ? (
                            <span className="hidden max-w-[10rem] truncate text-xs text-gray-500 sm:inline md:max-w-[14rem]">
                                {accountLabel}
                            </span>
                        ) : null}
                        {firebaseConfigured && user ? (
                            <motion.button
                                type="button"
                                onClick={() => void handleSignOut()}
                                whileHover={reduceMotion ? undefined : { y: -2 }}
                                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                                transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                                className="group inline-flex items-center gap-2 rounded-xl border border-violet-200/90 bg-white/95 px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-violet-500/10 backdrop-blur-sm transition-[background-color,box-shadow,border-color,color,ring-color] duration-200 ease-out hover:border-violet-300 hover:bg-realize-gradient-fuchsia hover:text-slate-900 hover:shadow-md hover:ring-violet-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 focus-visible:ring-offset-2"
                            >
                                <LogOut
                                    className="h-4 w-4 shrink-0 text-violet-600 transition-[transform,color] duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-violet-900 motion-reduce:group-hover:translate-x-0"
                                    aria-hidden
                                />
                                Log out
                            </motion.button>
                        ) : null}
                    </motion.div>
                </motion.header>

                {/* Canvas Area */}
                <div className="flex-1 flex gap-6 p-6 min-h-0">
                    <div className="flex-3 min-w-0">
                        <div className="h-full rounded-2xl overflow-hidden border-2 border-gray-200 shadow-xl bg-white">
                            <DesignerCanvas />
                        </div>
                    </div>

                    <div className="flex-[1] min-w-0">
                        <CanvasGuidePanel />
                    </div>
                </div>
            </main>
        </div>
    );
}

function DesignerPageFallback() {
    return (
        <div className="flex h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 font-roboto">
            <p className="text-sm text-gray-600">Loading…</p>
        </div>
    );
}

export default function DesignerPage() {
    return (
        <Suspense fallback={<DesignerPageFallback />}>
            <DesignerPageInner />
        </Suspense>
    );
}