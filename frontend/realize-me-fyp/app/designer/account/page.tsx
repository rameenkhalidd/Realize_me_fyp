'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import AccountSettingsCard from '@/components/account/AccountSettingsCard';
import { useAuth } from '@/components/auth/AuthProvider';
import { isFirebaseConfigured } from '@/lib/firebase/config';

export default function DesignerAccountPage() {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!isFirebaseConfigured()) {
            router.replace('/designer');
            return;
        }
        if (!loading && !user) {
            router.replace('/login?next=/designer/account');
        }
    }, [router, loading, user]);

    if (!user) {
        return (
            <div className="flex min-h-0 flex-1 items-center justify-center p-6">
                <p className="text-sm text-gray-500">Loading account…</p>
            </div>
        );
    }

    return (
        <div className="min-h-0 flex-1 overflow-y-auto">
            <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
                <header className="mb-8">
                    <h1 className="font-raleway text-2xl font-bold text-gray-900">Account Settings</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage your profile and security preferences.
                    </p>
                </header>
                <AccountSettingsCard user={user} />
            </main>
        </div>
    );
}
