"use client";

import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Button } from "../ui/button";

export default function CTA() {
    const sectionRef = useRef<HTMLElement>(null);
    const reduceMotion = useReducedMotion() === true;

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"],
    });

    const cyanY = useTransform(
        scrollYProgress,
        [0, 1],
        reduceMotion ? [0, 0] : [64, -72]
    );
    const cyanX = useTransform(
        scrollYProgress,
        [0, 1],
        reduceMotion ? [0, 0] : [0, 48]
    );
    const violetY = useTransform(
        scrollYProgress,
        [0, 1],
        reduceMotion ? [0, 0] : [-48, 80]
    );
    const violetX = useTransform(
        scrollYProgress,
        [0, 1],
        reduceMotion ? [0, 0] : [0, -36]
    );
    const contentY = useTransform(
        scrollYProgress,
        [0, 1],
        reduceMotion ? [0, 0] : [20, -24]
    );

    return (
        <section ref={sectionRef} className="container mx-auto px-5 sm:px-6 md:px-8 lg:px-10 xl:px-12 mb-24 overflow-x-clip">
            <div className="relative rounded-[2.5rem] overflow-hidden bg-[#F8F9FA] border border-white shadow-xl">

                <motion.div
                    className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#06B6D4]/10 blur-[100px] rounded-full pointer-events-none will-change-transform"
                    style={{ y: cyanY, x: cyanX }}
                />

                <motion.div
                    className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#8B5CF6]/10 blur-[100px] rounded-full pointer-events-none will-change-transform"
                    style={{ y: violetY, x: violetX }}
                />

                <motion.div
                    className="relative z-10 px-6 py-24 text-center sm:px-8 md:px-12 md:py-32 lg:px-16"
                    style={{ y: contentY }}
                >
                    <h2 className="text-3xl md:text-5xl font-bold mb-6 text-[#1F2937] font-raleway">
                        Ready to realize your style?
                    </h2>

                    <p className="text-gray-700 text-lg md:text-xl mb-10 max-w-2xl mx-auto font-roboto">
                        Join thousands of fashion enthusiasts creating and discovering their
                        dream outfits today.
                    </p>

                    <Link href="/demo">
                        <Button
                            variant="gradient"
                            size="lg"
                            className="shadow-xl shadow-purple-500/20 text-lg px-10 h-14 font-raleway font-bold"
                        >
                            Start sketching <ArrowRight className="ml-2" />
                        </Button>
                    </Link>
                </motion.div>
            </div>
        </section>
    );
}
