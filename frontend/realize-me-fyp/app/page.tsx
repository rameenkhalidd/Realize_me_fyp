//C:\Users\sohai\realizeme\app\page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import HowItWorks from "../components/landing/HowItWorks";
import CTA from "../components/landing/CTA";
import Footer from "../components/landing/Footer";
import { FeaturesModalProvider } from "../components/landing/FeaturesModalContext";
import { useAuth } from '@/components/auth/AuthProvider';
import { hasClientAuthSession, isAuthRequired } from '@/lib/auth-flags';
import { isFirebaseConfigured } from '@/lib/firebase/config';

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Authenticated users should normally live in /designer, not landing.
    if (isFirebaseConfigured()) {
      if (!authLoading && user) {
        router.replace('/designer');
      }
      return;
    }

    if (isAuthRequired() && hasClientAuthSession()) {
      router.replace('/designer');
    }
  }, [router, authLoading, user]);

  return (
    <FeaturesModalProvider>
      <div className="min-h-screen bg-[#F8F9FA] text-[#1F2937] font-roboto">
        <Navbar />
        <main className="flex flex-col gap-24">
          <Hero />
          <HowItWorks />
          <CTA />
        </main>
        <Footer />
      </div>
    </FeaturesModalProvider>
  );
}
