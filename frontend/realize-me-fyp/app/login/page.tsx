'use client';

import { Suspense, useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Eye, EyeOff, FolderOpen, History, Pencil } from 'lucide-react';

import { useAuth } from '@/components/auth/AuthProvider';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { loginSchema, forgotPasswordSchema, type LoginFormValues } from '@/lib/auth-schemas';
import { mapFirebaseAuthError } from '@/lib/map-firebase-auth-error';
import { shouldAutoRedirectAuthenticatedUser } from '@/lib/auth-login-redirect';
import { EmailNotVerifiedError } from '@/lib/firebase/email-verification';
import { safeRelativeNextPath } from '@/lib/safe-next-path';
import { DESIGNER_LAVENDER_PAGE_BACKGROUND } from '@/lib/designer-page-background';
import { INTERACTIVE_BUTTON_MOTION } from '@/lib/interactive-button-motion';

const authBackLinkClass = `absolute left-4 top-4 inline-flex items-center gap-2 rounded-xl border border-violet-200/90 bg-white/95 px-3.5 py-2 text-sm font-semibold text-violet-900 shadow-sm backdrop-blur-sm hover:border-violet-300 hover:bg-violet-50/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40 sm:left-6 sm:top-6 ${INTERACTIVE_BUTTON_MOTION}`;

const fieldClass =
    'mt-1.5 flex h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20';

const fieldErrorClass = 'mt-1 text-sm text-red-600';
const signedInNoticeClass =
    'fixed left-1/2 top-4 z-50 w-[min(calc(100vw-2rem),34rem)] -translate-x-1/2 rounded-xl border border-purple-200/90 bg-white/95 px-4 py-3 text-center text-sm text-gray-700 shadow-md backdrop-blur-sm ring-1 ring-violet-500/10';

const resetToastClass =
    'fixed bottom-6 right-6 z-50 w-[min(calc(100vw-2rem),20rem)] rounded-xl border border-purple-200/90 bg-white/95 px-4 py-3 text-sm text-gray-700 shadow-md backdrop-blur-sm ring-1 ring-violet-500/10';

function fieldRing(invalid: boolean) {
    return invalid ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : '';
}

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: authLoading, configured, signInWithEmail, signInWithGoogle, sendPasswordResetEmail, resendVerificationEmail } = useAuth();
    const formId = useId();
    const emailErrorId = `${formId}-email-error`;
    const passwordErrorId = `${formId}-password-error`;
    const formErrorId = `${formId}-form-error`;

    const [showPassword, setShowPassword] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [googlePending, setGooglePending] = useState(false);
    const [forgotMessage, setForgotMessage] = useState<string | null>(null);
    const [resetToast, setResetToast] = useState<string | null>(null);
    const [resetPending, setResetPending] = useState(false);
    const [resendPending, setResendPending] = useState(false);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);
    const [showResendVerification, setShowResendVerification] = useState(false);

    const {
        register,
        handleSubmit,
        getValues,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });

    const nextParam = searchParams.get('next');
    const safeNext = safeRelativeNextPath(nextParam);
    const showCheckEmailBanner = searchParams.get('checkEmail') === '1';
    const showVerifiedBanner = searchParams.get('verified') === '1';
    const authQuerySuffix = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const showSignedInNotice = configured && !authLoading && shouldAutoRedirectAuthenticatedUser(user);

    useEffect(() => {
        if (showCheckEmailBanner) {
            setInfoMessage('Check your email to verify your account. After verifying, log in below.');
        } else if (showVerifiedBanner) {
            setInfoMessage('Email verified successfully. You can log in now.');
        }
    }, [showCheckEmailBanner, showVerifiedBanner]);

    useEffect(() => {
        if (!resetToast) {
            return;
        }
        const id = window.setTimeout(() => setResetToast(null), 3000);
        return () => window.clearTimeout(id);
    }, [resetToast]);

    useEffect(() => {
        if (authLoading || !shouldAutoRedirectAuthenticatedUser(user)) {
            return;
        }
        router.replace(safeNext);
    }, [authLoading, user, router, safeNext]);

    const onSubmit = handleSubmit(async (data) => {
        setFormError(null);
        setShowResendVerification(false);
        setInfoMessage(
            showCheckEmailBanner
                ? 'Check your email to verify your account. After verifying, log in below.'
                : showVerifiedBanner
                  ? 'Email verified successfully. You can log in now.'
                  : null
        );
        try {
            await signInWithEmail(data.email, data.password);
            router.replace(safeNext);
        } catch (err) {
            const message = mapFirebaseAuthError(err);
            setFormError(message);
            if (err instanceof EmailNotVerifiedError) {
                setShowResendVerification(true);
            }
        }
    });

    const onResendVerification = async () => {
        setFormError(null);
        if (!showCheckEmailBanner) {
            setInfoMessage(null);
        }
        const email = getValues('email').trim();
        const password = getValues('password');
        if (!email || !password) {
            setFormError('Enter your email and password, then resend the verification link.');
            return;
        }

        setResendPending(true);
        const result = await resendVerificationEmail(email, password, nextParam ? safeNext : null);
        setResendPending(false);

        if (!result.success) {
            setFormError(result.error ?? 'Could not resend verification email.');
            return;
        }

        setInfoMessage(result.message ?? 'Verification email sent — check your inbox.');
        setShowResendVerification(false);
    };

    const onGoogle = async () => {
        setFormError(null);
        setForgotMessage(null);
        setInfoMessage(null);
        setShowResendVerification(false);
        setGooglePending(true);
        try {
            await signInWithGoogle();
            router.replace(safeNext);
        } catch (err) {
            setFormError(mapFirebaseAuthError(err));
        } finally {
            setGooglePending(false);
        }
    };

    const onForgotPassword = async () => {
        setForgotMessage(null);
        setFormError(null);
        const email = getValues('email').trim();
        const parsed = forgotPasswordSchema.safeParse({ email });
        if (!parsed.success) {
            setForgotMessage('Enter your email above first, then we can send a reset link.');
            return;
        }

        setResetPending(true);
        const result = await sendPasswordResetEmail(parsed.data.email);
        setResetPending(false);

        if (!result.success) {
            setForgotMessage(result.error ?? 'Could not send reset email.');
            return;
        }

        setResetToast('Reset link sent — check your inbox.');
    };

    const busy = isSubmitting || googlePending || resetPending || resendPending;
    const disableActions = !configured || busy || (authLoading && configured);

    return (
        <main
            className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10 font-roboto"
            style={{ background: DESIGNER_LAVENDER_PAGE_BACKGROUND }}
        >
            <Link href="/" className={authBackLinkClass}>
                <ArrowLeft size={16} aria-hidden />
                Back
            </Link>
            {showSignedInNotice ? (
                <div className={signedInNoticeClass} role="status">
                    You&apos;re already signed in - opening your workspace...
                </div>
            ) : null}
            {resetToast ? (
                <div className={resetToastClass} role="status" aria-live="polite">
                    {resetToast}
                </div>
            ) : null}
            <Card className="mx-auto flex w-full max-w-5xl overflow-hidden rounded-3xl border-gray-200 py-0 shadow-2xl">
                <section className="hidden w-1/2 bg-linear-to-br from-[#8B5CF6] via-[#D946EF] to-[#06B6D4] p-10 text-white lg:flex lg:flex-col">
                    <div className="max-w-sm">
                        <BrandLogo theme="dark" className="mb-6" />
                        <h1 className="font-raleway text-3xl font-bold leading-tight">Welcome back</h1>
                        <p className="mt-4 text-sm text-white/90">
                            Pick up your canvas and continue where you left off.
                        </p>
                        <ul className="mt-6 space-y-3 text-sm text-white/80">
                            <li className="flex items-start gap-2.5">
                                <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-white/70" aria-hidden />
                                Access the saved draft
                            </li>
                            <li className="flex items-start gap-2.5">
                                <Pencil className="mt-0.5 h-4 w-4 shrink-0 text-white/70" aria-hidden />
                                Continue sketching
                            </li>
                            <li className="flex items-start gap-2.5">
                                <History className="mt-0.5 h-4 w-4 shrink-0 text-white/70" aria-hidden />
                                Browse your design history
                            </li>
                        </ul>
                    </div>
                </section>

                <section className="w-full p-6 sm:p-10 lg:w-1/2">
                    <div className="mx-auto max-w-sm">
                        <h2 className="font-raleway text-3xl font-bold text-gray-900">Log in</h2>
                        <p className="mt-2 text-sm text-gray-500">Access your workspace and continue designing.</p>

                        {!configured ? (
                            <p
                                className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                                role="status"
                            >
                                Firebase is not configured. Copy <code className="rounded bg-amber-100 px-1">.env.example</code> to{' '}
                                <code className="rounded bg-amber-100 px-1">.env.local</code> and add your web app keys.
                            </p>
                        ) : null}

                        {infoMessage ? (
                            <p
                                className="mt-4 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900"
                                role="status"
                            >
                                {infoMessage}
                            </p>
                        ) : null}

                        {showCheckEmailBanner ? (
                            <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2.5">
                                <p className="text-xs text-violet-800">
                                    Didn&apos;t get the email? Check spam or your university quarantine.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => void onResendVerification()}
                                    disabled={disableActions}
                                    className="mt-2 text-xs font-semibold text-violet-700 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                                >
                                    {resendPending ? 'Sending verification email…' : 'Resend verification email'}
                                </button>
                            </div>
                        ) : null}

                        <div className="mt-6 space-y-3">
                            <Button
                                type="button"
                                variant="secondary"
                                className="h-11 w-full rounded-xl text-sm font-semibold"
                                disabled={disableActions}
                                onClick={onGoogle}
                            >
                                {googlePending ? 'Opening Google…' : 'Continue with Google'}
                            </Button>
                            <div className="relative flex items-center justify-center py-2">
                                <div className="absolute inset-x-0 top-1/2 h-px bg-gray-200" aria-hidden />
                                <span className="relative bg-white px-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                                    or use email
                                </span>
                            </div>
                        </div>

                        <form className="mt-4 space-y-5" onSubmit={onSubmit} noValidate>
                            {formError ? (
                                <div
                                    id={formErrorId}
                                    role="alert"
                                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                                >
                                    {formError}
                                    {showResendVerification ? (
                                        <button
                                            type="button"
                                            onClick={() => void onResendVerification()}
                                            disabled={disableActions}
                                            className="mt-2 block text-left text-xs font-semibold text-violet-700 underline-offset-2 hover:underline"
                                        >
                                            {resendPending ? 'Sending verification email…' : 'Resend verification email'}
                                        </button>
                                    ) : null}
                                </div>
                            ) : null}

                            <div>
                                <label htmlFor={`${formId}-email`} className="block text-sm font-medium text-gray-700">
                                    Email
                                </label>
                                <input
                                    id={`${formId}-email`}
                                    type="email"
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    className={`${fieldClass} ${fieldRing(!!errors.email)}`}
                                    aria-invalid={errors.email ? 'true' : 'false'}
                                    aria-describedby={
                                        [errors.email ? emailErrorId : '', formError && formErrorId].filter(Boolean).join(' ') ||
                                        undefined
                                    }
                                    {...register('email')}
                                />
                                {errors.email ? (
                                    <p id={emailErrorId} className={fieldErrorClass}>
                                        {errors.email.message}
                                    </p>
                                ) : null}
                            </div>

                            <div>
                                <label htmlFor={`${formId}-password`} className="block text-sm font-medium text-gray-700">
                                    Password
                                </label>
                                <div className="relative mt-1.5">
                                    <input
                                        id={`${formId}-password`}
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        placeholder="Enter your password"
                                        className={`${fieldClass} pr-11 ${fieldRing(!!errors.password)}`}
                                        aria-invalid={errors.password ? 'true' : 'false'}
                                        aria-describedby={
                                            [errors.password ? passwordErrorId : '', formError && formErrorId]
                                                .filter(Boolean)
                                                .join(' ') || undefined
                                        }
                                        {...register('password')}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                                        onClick={() => setShowPassword((v) => !v)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {errors.password ? (
                                    <p id={passwordErrorId} className={fieldErrorClass}>
                                        {errors.password.message}
                                    </p>
                                ) : null}
                                <div className="mt-2 flex flex-col items-start gap-1">
                                    <button
                                        type="button"
                                        onClick={() => void onForgotPassword()}
                                        disabled={disableActions}
                                        className="text-xs font-medium text-violet-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                                    >
                                        {resetPending ? 'Sending reset link…' : 'Forgot password?'}
                                    </button>
                                    {forgotMessage ? (
                                        <p className="text-xs text-red-600" role="alert">
                                            {forgotMessage}
                                        </p>
                                    ) : null}
                                </div>
                            </div>

                            <Button
                                type="submit"
                                variant="gradient"
                                className="h-11 w-full rounded-xl text-sm font-semibold"
                                disabled={disableActions}
                            >
                                {isSubmitting ? 'Signing in…' : 'Log In'}
                            </Button>
                        </form>

                        <div className="mt-4 space-y-3">
                            <Link
                                href={`/signup${authQuerySuffix}`}
                                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                            >
                                Create new account
                            </Link>
                            <Link
                                href="/demo"
                                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-purple-700 transition hover:text-purple-800"
                            >
                                Try the canvas as a guest
                                <ArrowRight size={16} aria-hidden />
                            </Link>
                        </div>
                    </div>
                </section>
            </Card>
        </main>
    );
}

function LoginFallback() {
    return (
        <main
            className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 font-roboto"
            style={{ background: DESIGNER_LAVENDER_PAGE_BACKGROUND }}
        >
            <Card className="mx-auto w-full max-w-md rounded-3xl border-gray-200 p-10 text-center shadow-xl">
                <p className="text-sm text-gray-600">Loading…</p>
            </Card>
        </main>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<LoginFallback />}>
            <LoginForm />
        </Suspense>
    );
}
