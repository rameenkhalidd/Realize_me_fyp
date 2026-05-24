"use client";

import { useRef, useState } from "react";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { DemoPreviewModal } from "./DemoPreviewModal";

/** Pixels of document scroll over which parallax runs (hero + start of next section). */
const PARALLAX_SCROLL = 560;

export default function Hero() {
    const sectionRef = useRef<HTMLElement>(null);
    const [demoOpen, setDemoOpen] = useState(false);
    /** Set false when /hero-sketch.png is missing or fails to load */
    const [heroImageOk, setHeroImageOk] = useState(true);
    const reduceMotion = useReducedMotion() === true;

    // Document scroll is reliable for above-the-fold heroes (section-based progress often sits mid-range on load).
    const { scrollY } = useScroll();

    const clamp = { clamp: true } as const;

    const textY = useTransform(
        scrollY,
        [0, PARALLAX_SCROLL],
        reduceMotion ? [0, 0] : [0, 56],
        clamp
    );
    const frameY = useTransform(
        scrollY,
        [0, PARALLAX_SCROLL],
        reduceMotion ? [0, 0] : [0, -120],
        clamp
    );
    const imgInnerY = useTransform(
        scrollY,
        [0, PARALLAX_SCROLL],
        reduceMotion ? [0, 0] : [0, 72],
        clamp
    );
    const glowY = useTransform(
        scrollY,
        [0, PARALLAX_SCROLL],
        reduceMotion ? [0, 0] : [0, -64],
        clamp
    );
    const glowScale = useTransform(
        scrollY,
        [0, PARALLAX_SCROLL],
        reduceMotion ? [1, 1] : [1, 1.12],
        clamp
    );

    return (
        <section
            ref={sectionRef}
            id="hero"
            className="relative container mx-auto px-5 sm:px-6 md:px-8 lg:px-10 xl:px-12 pt-16 md:pt-24 pb-16 md:pb-20 overflow-x-clip min-h-[min(88vh,920px)] flex flex-col justify-center"
        >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                <motion.div
                    className="flex flex-col gap-6 text-center lg:text-left"
                    style={{ y: textY }}
                >

                    <div className="flex justify-center lg:justify-start">
                        <Badge className="bg-white border-gray-200 shadow-sm gap-2 pr-3 font-roboto">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-linear-to-r from-[#8B5CF6] to-[#D946EF]">
                                <Sparkles className="h-3 w-3 text-white" />
                            </span>
                            Powered by AI
                        </Badge>
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold font-raleway leading-[1.1]">
                        Turn your sketches into <br />
                        <span className="bg-linear-to-r from-[#8B5CF6] via-[#D946EF] to-[#FCA5A5] bg-clip-text text-transparent">
                            real fashion
                        </span>
                    </h1>

                    <p className="text-lg text-gray-700 leading-relaxed max-w-xl mx-auto lg:mx-0 font-roboto">
                        Draw your dream outfit, let AI transform it into photorealistic imagery,
                        and discover where to buy it from{" "}
                        <strong className="text-gray-900">thousands of fashion retailers.</strong>
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 pt-2">
                        <Link href="/demo">
                            <Button variant="gradient" size="lg" className="font-raleway font-bold group">
                                Start sketching
                                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </Link>

                        <Button
                            type="button"
                            variant="secondary"
                            size="lg"
                            className="gap-2"
                            onClick={() => setDemoOpen(true)}
                        >
                            <Play className="h-4 w-4" />
                            Watch Demo
                        </Button>
                    </div>

                </motion.div>

                <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
                    <motion.div
                        className="relative aspect-4/3 w-full min-h-[200px] overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-2xl will-change-transform"
                        style={{ y: frameY }}
                    >
                        <motion.div
                            className="absolute inset-0"
                            style={{
                                y: imgInnerY,
                                scale: reduceMotion ? 1 : 1.08,
                            }}
                        >
                            {heroImageOk ? (
                                <Image
                                    src="/hero-sketch.png"
                                    alt="AI fashion example: sketch to outfit visualization"
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 1024px) 100vw, 50vw"
                                    priority
                                    onError={() => setHeroImageOk(false)}
                                />
                            ) : (
                                <div className="flex h-full min-h-[220px] w-full flex-col items-center justify-center gap-3 bg-linear-to-br from-violet-50 via-white to-cyan-50 px-6 text-center">
                                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-[#8B5CF6]/20 to-[#06B6D4]/20 text-[#8B5CF6]">
                                        <Sparkles className="h-7 w-7" strokeWidth={1.75} />
                                    </span>
                                    <p className="text-sm font-medium text-gray-800 font-raleway">
                                        Hero image placeholder
                                    </p>
                                    <p className="max-w-xs text-xs leading-relaxed text-gray-600 font-roboto">
                                        Add your artwork as{" "}
                                        <code className="rounded bg-white/80 px-1.5 py-0.5 text-[0.7rem] text-gray-800">
                                            public/hero-sketch.png
                                        </code>{" "}
                                        — then refresh the page.
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>

                    <motion.div
                        className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-linear-to-r from-[#8B5CF6] to-[#06B6D4] opacity-20 blur-3xl will-change-transform"
                        style={{ y: glowY, scale: glowScale }}
                    />
                </div>

            </div>

            <DemoPreviewModal open={demoOpen} onClose={() => setDemoOpen(false)} />
        </section>
    );
}
