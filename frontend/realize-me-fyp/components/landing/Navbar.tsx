//components/landing/Navbar.tsx
"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "../ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { useFeaturesModal } from "./FeaturesModalContext";

const NAV_LINKS = [
    { href: "#hero", label: "Home" },
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How it works?" },
    { href: "#about", label: "About" },
] as const;

const springSoft = { type: "spring" as const, stiffness: 380, damping: 28 };

const navLinkClass =
    "group relative border-0 bg-transparent p-0 text-left font-roboto text-sm font-medium text-neutral-900 hover:text-black cursor-pointer";

export default function Navbar() {
    const [open, setOpen] = useState(false);
    const reduceMotion = useReducedMotion();
    const { openFeatures } = useFeaturesModal();

    const instant = reduceMotion ? { duration: 0 } : undefined;

    const pillShell =
        "rounded-full border border-black bg-white/70 shadow-[4px_4px_0px_0px_rgb(0,0,0)] backdrop-blur-md supports-[backdrop-filter]:bg-white/65";

    return (
        <motion.nav
            initial={reduceMotion ? false : { opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={instant ?? { type: "spring", stiffness: 260, damping: 28 }}
            className="sticky top-0 z-50 w-full bg-transparent px-5 pt-4 pb-2 sm:px-6 md:px-8 md:pt-5 md:pb-3 lg:px-10 xl:px-12"
        >
            <div className="container mx-auto max-w-5xl">
                <div className={`flex min-h-13 items-center justify-between gap-3 px-4 py-2 sm:px-5 sm:py-2.5 md:min-h-14 md:px-6 ${pillShell}`}>
                    <Link href="/" className="inline-flex shrink-0">
                        <motion.div
                            className="flex items-center"
                            whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                            transition={springSoft}
                        >
                            <BrandLogo theme="light" />
                        </motion.div>
                    </Link>

                    <motion.div
                        className="hidden md:flex flex-1 justify-end gap-8 pr-2 font-roboto text-neutral-900"
                        initial="hidden"
                        animate="show"
                        variants={{
                            hidden: {},
                            show: {
                                transition: {
                                    staggerChildren: reduceMotion ? 0 : 0.06,
                                    delayChildren: reduceMotion ? 0 : 0.05,
                                },
                            },
                        }}
                    >
                        {NAV_LINKS.map(({ href, label }) =>
                            href === "#features" ? (
                                <motion.button
                                    key="features"
                                    type="button"
                                    className={navLinkClass}
                                    onClick={() => openFeatures()}
                                    variants={{
                                        hidden: { opacity: 0, y: -6 },
                                        show: { opacity: 1, y: 0 },
                                    }}
                                    transition={instant ?? { type: "spring", stiffness: 400, damping: 30 }}
                                    whileHover={reduceMotion ? undefined : { y: -1, transition: { duration: 0.15 } }}
                                >
                                    {label}
                                    <span className="absolute -bottom-0.5 left-0 right-0 h-px origin-left scale-x-0 bg-linear-to-r from-[#8B5CF6] to-[#06B6D4] transition-transform duration-200 group-hover:scale-x-100" />
                                </motion.button>
                            ) : (
                                <motion.a
                                    key={href}
                                    href={href}
                                    className={`${navLinkClass} inline-block`}
                                    variants={{
                                        hidden: { opacity: 0, y: -6 },
                                        show: { opacity: 1, y: 0 },
                                    }}
                                    transition={instant ?? { type: "spring", stiffness: 400, damping: 30 }}
                                    whileHover={reduceMotion ? undefined : { y: -1, transition: { duration: 0.15 } }}
                                >
                                    {label}
                                    <span className="absolute -bottom-0.5 left-0 right-0 h-px origin-left scale-x-0 bg-linear-to-r from-[#8B5CF6] to-[#06B6D4] transition-transform duration-200 group-hover:scale-x-100" />
                                </motion.a>
                            )
                        )}
                    </motion.div>

                    <motion.div
                        className="hidden md:flex shrink-0 items-center gap-3"
                        initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={instant ?? { type: "spring", stiffness: 280, damping: 26, delay: 0.12 }}
                    >
                        <motion.span whileHover={reduceMotion ? undefined : { y: -1 }}>
                            <Link
                                href="/login"
                                className="inline-flex items-center justify-center rounded-full border border-black px-4 py-2 font-roboto text-sm font-semibold text-[#1F2937] transition-colors hover:bg-white/90 hover:text-black"
                            >
                                Log In
                            </Link>
                        </motion.span>
                        <Link href="/signup">
                            <motion.span
                                className="inline-block"
                                whileHover={reduceMotion ? undefined : { y: -1 }}
                                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                            >
                                <Button
                                    variant="gradient"
                                    size="sm"
                                    className="border border-black font-raleway font-semibold shadow-[2px_2px_0px_0px_rgb(0,0,0)]"
                                >
                                    Sign Up
                                </Button>
                            </motion.span>
                        </Link>
                    </motion.div>

                    <motion.button
                        type="button"
                        className="md:hidden rounded-full p-2 text-neutral-900 hover:bg-black/5"
                        aria-expanded={open}
                        aria-label={open ? "Close menu" : "Open menu"}
                        onClick={() => setOpen(!open)}
                        whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                    >
                        <motion.span
                            animate={{ rotate: open ? 90 : 0 }}
                            transition={instant ?? { type: "spring", stiffness: 300, damping: 22 }}
                        >
                            {open ? <X /> : <Menu />}
                        </motion.span>
                    </motion.button>
                </div>

                <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        className={`md:hidden mt-3 overflow-hidden ${pillShell}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={
                            instant ?? { height: { duration: 0.28 }, opacity: { duration: 0.2 } }
                        }
                    >
                        <motion.div
                            className="flex flex-col items-center gap-4 p-4 font-roboto text-neutral-900"
                            initial="closed"
                            animate="open"
                            exit="closed"
                            variants={{
                                open: {
                                    transition: {
                                        staggerChildren: reduceMotion ? 0 : 0.05,
                                        delayChildren: 0.02,
                                    },
                                },
                                closed: {},
                            }}
                        >
                            {NAV_LINKS.map(({ href, label }) =>
                                href === "#features" ? (
                                    <motion.button
                                        key="features"
                                        type="button"
                                        className="py-2 font-medium font-roboto text-neutral-900"
                                        onClick={() => {
                                            setOpen(false);
                                            openFeatures();
                                        }}
                                        variants={{
                                            open: { opacity: 1, x: 0 },
                                            closed: { opacity: 0, x: -10 },
                                        }}
                                        transition={instant ?? { type: "spring", stiffness: 320, damping: 28 }}
                                    >
                                        {label}
                                    </motion.button>
                                ) : (
                                    <motion.a
                                        key={href}
                                        href={href}
                                        className="py-2 font-medium"
                                        onClick={() => setOpen(false)}
                                        variants={{
                                            open: { opacity: 1, x: 0 },
                                            closed: { opacity: 0, x: -10 },
                                        }}
                                        transition={instant ?? { type: "spring", stiffness: 320, damping: 28 }}
                                    >
                                        {label}
                                    </motion.a>
                                )
                            )}

                            <motion.div
                                className="mt-4 flex w-full flex-col gap-2"
                                variants={{
                                    open: { opacity: 1, y: 0 },
                                    closed: { opacity: 0, y: 8 },
                                }}
                            >
                                <Link href="/login" onClick={() => setOpen(false)}>
                                    <span className="flex w-full items-center justify-center rounded-full border border-black py-2.5 font-roboto text-sm font-semibold text-[#1F2937] hover:bg-white/90 hover:text-black">
                                        Log In
                                    </span>
                                </Link>
                                <Link href="/signup" onClick={() => setOpen(false)}>
                                    <Button
                                        variant="gradient"
                                        className="w-full border border-black font-raleway shadow-[2px_2px_0px_0px_rgb(0,0,0)]"
                                    >
                                        Sign Up
                                    </Button>
                                </Link>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                )}
                </AnimatePresence>
            </div>
        </motion.nav>
    );
}
