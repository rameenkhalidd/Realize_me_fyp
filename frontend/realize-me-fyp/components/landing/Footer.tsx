"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Button } from "../ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { INTERACTIVE_BUTTON_MOTION } from "@/lib/interactive-button-motion";
import { useFeaturesModal } from "./FeaturesModalContext";

export default function Footer() {
  const { openFeatures } = useFeaturesModal();
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion() === true;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const brandY = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? [0, 0] : [16, -20]
  );
  const linksY = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? [0, 0] : [8, -10]
  );
  const ctaY = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? [0, 0] : [0, -14]
  );
  const glowY = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? [0, 0] : [40, -30]
  );

  return (
    <footer
      ref={sectionRef}
      id="about"
      className="relative bg-[#050607] text-gray-400 border-t border-gray-900 py-16 font-roboto overflow-x-clip scroll-mt-24"
    >
      <motion.div
        className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 w-[min(90vw,520px)] h-40 bg-[#8B5CF6]/15 blur-[80px] rounded-full"
        style={{ y: glowY }}
        aria-hidden
      />

      <div className="container relative z-10 mx-auto px-5 sm:px-6 md:px-8 lg:px-10 xl:px-12">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">

          <motion.div className="lg:col-span-2 space-y-6 will-change-transform" style={{ y: brandY }}>
            <BrandLogo theme="dark" />

            <p className="text-sm font-medium text-white">
              AI-powered sketch-to-product discovery
            </p>

            <p className="text-sm leading-relaxed max-w-xs">
              Made with curiosity, creativity, and a little bit of AI to help
              you find exactly what you&apos;re looking for.
            </p>
          </motion.div>

          <motion.div className="will-change-transform" style={{ y: linksY }}>
            <h4 className="text-white font-semibold mb-6 font-raleway">
              Links
            </h4>
            <ul className="space-y-4 text-sm">
              <li>
                <button
                  type="button"
                  onClick={openFeatures}
                  className={`text-sm hover:text-white text-left bg-transparent border-0 cursor-pointer px-0 py-0.5 font-inherit rounded-sm ${INTERACTIVE_BUTTON_MOTION}`}
                >
                  Features
                </button>
              </li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How it works</a></li>
              <li><Link href="/demo" className="hover:text-white transition-colors">Start sketching</Link></li>
              <li><a href="#about" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </motion.div>

          <motion.div className="will-change-transform" style={{ y: linksY }}>
            <h4 className="text-white font-semibold mb-6 font-raleway">
              Privacy & Terms
            </h4>
            <ul className="space-y-4 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Privacy notes</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms & conditions</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Responsible AI</a></li>
            </ul>
          </motion.div>

          <motion.div className="flex flex-col gap-6 will-change-transform" style={{ y: ctaY }}>
            <h4 className="text-white font-semibold font-raleway">
              Get Started
            </h4>

            <div className="flex flex-col gap-4 text-sm">
              <Link href="/signup" className="hover:text-white transition-colors">Sign up</Link>
              <Link href="/login" className="hover:text-white transition-colors">Log in</Link>

              <Link href="/demo">
                <Button
                  variant="gradient"
                  size="sm"
                  className="w-fit font-raleway font-bold"
                >
                  Start sketching <ArrowRight className="ml-1 w-3 h-3" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="border-t border-gray-900 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <p>© 2025 RealizeMe</p>
          <p className="text-right">
            Crafted with patience, passion, and pixels.
            <br />
            Powered by open-source knowledge & creativity.
          </p>
        </div>
      </div>
    </footer>
  );
}
