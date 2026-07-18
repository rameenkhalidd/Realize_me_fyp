'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { History, SquarePen, LogOut, PanelLeft, LayoutGrid } from 'lucide-react';

import { useAuth } from '@/components/auth/AuthProvider';
import { getAccountInitial } from '@/lib/auth-user-utils';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { buildDesignerAccountHrefFromContext } from '@/lib/designer-account-return';
import { useSignOutConfirm } from '@/components/designer/SignOutConfirmContext';
import { INTERACTIVE_BUTTON_MOTION } from '@/lib/interactive-button-motion';

type DesignerRailProps = {
    expanded: boolean;
    onToggleExpanded: () => void;
    reduceMotion?: boolean | null;
};

function navItemClass(active: boolean, expanded: boolean): string {
    return [
        'flex items-center rounded-md text-xs font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50',
        INTERACTIVE_BUTTON_MOTION,
        expanded ? 'h-9 w-full gap-2 px-1.5' : 'mx-auto h-9 w-9 justify-center',
        active ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white',
    ].join(' ');
}

function labelClass(expanded: boolean, reduceMotion?: boolean | null): string {
    return [
        'truncate whitespace-nowrap text-xs',
        expanded ? 'opacity-100' : 'pointer-events-none opacity-0',
        reduceMotion ? '' : 'transition-opacity duration-150',
    ]
        .filter(Boolean)
        .join(' ');
}

type NavItemConfig = {
    href: string;
    label: string;
    collapsedTitle: string;
    active: boolean;
    icon: ReactNode;
};

function RailNavItem({
    item,
    expanded,
    reduceMotion,
}: {
    item: NavItemConfig;
    expanded: boolean;
    reduceMotion?: boolean | null;
}) {
    return (
        <Link
            href={item.href}
            scroll={false}
            aria-label={item.label}
            title={expanded ? undefined : item.collapsedTitle}
            className={navItemClass(item.active, expanded)}
        >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center">{item.icon}</span>
            <span className={labelClass(expanded, reduceMotion)} aria-hidden={!expanded}>
                {item.label}
            </span>
        </Link>
    );
}

function AccountAvatarLink({
    initial,
    onAccount,
    href,
    title,
    className,
}: {
    initial: string;
    onAccount: boolean;
    href: string;
    title?: string;
    className?: string;
}) {
    return (
        <Link
            href={href}
            scroll={false}
            aria-label="Account settings"
            title={title}
            className={`flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-violet-500 to-cyan-500 text-xs font-bold text-white transition-all duration-150 hover:ring-2 hover:ring-violet-400/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 ${
                onAccount ? 'ring-2 ring-violet-400/80' : ''
            } ${className ?? ''}`}
        >
            {initial}
        </Link>
    );
}

export default function DesignerRail({ expanded, onToggleExpanded, reduceMotion }: DesignerRailProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { requestSignOut } = useSignOutConfirm();

    const onDesign = pathname === '/designer';
    const onHistory = pathname.startsWith('/designer/history');
    const onTemplates = pathname.startsWith('/designer/templates');
    const onAccount = pathname.startsWith('/designer/account');

    const initial = getAccountInitial(user);
    const accountHref = buildDesignerAccountHrefFromContext(pathname, searchParams);

    const navItems: NavItemConfig[] = [
        {
            href: '/designer',
            label: 'Canvas',
            collapsedTitle: 'Go to Canvas',
            active: onDesign,
            icon: <SquarePen className="h-5 w-5" aria-hidden />,
        },
        {
            href: '/designer/templates',
            label: 'Templates',
            collapsedTitle: 'Go to Templates',
            active: onTemplates,
            icon: <LayoutGrid className="h-5 w-5" aria-hidden />,
        },
        {
            href: '/designer/history',
            label: 'My work',
            collapsedTitle: 'Go to My work',
            active: onHistory,
            icon: <History className="h-5 w-5" aria-hidden />,
        },
    ];

    return (
        <div
            className={`flex h-full min-h-0 flex-col gap-2 overflow-hidden py-4 pb-14 ${expanded ? 'px-1.5' : 'items-center px-1'}`}
        >
            <div className="flex w-full justify-center">
                <button
                    type="button"
                    onClick={onToggleExpanded}
                    aria-expanded={expanded}
                    aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
                    title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 ${INTERACTIVE_BUTTON_MOTION}`}
                >
                    <PanelLeft className="h-5 w-5" aria-hidden />
                </button>
            </div>

            <div
                className={`h-px bg-gray-800 ${expanded ? 'mx-1 w-auto' : 'w-8'}`}
                aria-hidden
            />

            <nav className={`flex flex-col gap-1 ${expanded ? 'w-full' : 'w-full items-center'}`}>
                {navItems.map((item) => (
                    <RailNavItem
                        key={item.href}
                        item={item}
                        expanded={expanded}
                        reduceMotion={reduceMotion}
                    />
                ))}
            </nav>

            {isFirebaseConfigured() && user ? (
                <div className="mt-auto flex w-full flex-col items-center gap-2 pt-2">
                    <div
                        className={`h-px bg-gray-800 ${expanded ? 'mx-1 w-auto self-stretch' : 'w-8'}`}
                        aria-hidden
                    />

                    <AccountAvatarLink
                        initial={initial}
                        onAccount={onAccount}
                        href={accountHref}
                        title="Account settings"
                    />
                    <button
                        type="button"
                        onClick={requestSignOut}
                        aria-label="Sign out"
                        title="Sign out"
                        className={navItemClass(false, false)}
                    >
                        <LogOut className="h-5 w-5" aria-hidden />
                    </button>
                </div>
            ) : null}
        </div>
    );
}
