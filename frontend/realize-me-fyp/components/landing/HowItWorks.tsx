"use client";

import { useRef } from "react";
import { PenTool, ShoppingBag, Sparkles } from "lucide-react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion() === true;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Output ranges must start at 0 so cards share the same baseline at rest (non-zero starts misalign the row).
  const headerY = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? [0, 0] : [0, -32]
  );
  const card1Y = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? [0, 0] : [0, -20]
  );
  const card2Y = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? [0, 0] : [0, 24]
  );
  const card3Y = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? [0, 0] : [0, -18]
  );

  /** Plain `div` (not `Card`) so base Card styles cannot override border/radius/shadow. */
  const neubrutalistCardBase =
    "h-full rounded-xl border border-black bg-white p-10 text-[#1F2937] shadow-none transition-[transform,box-shadow] duration-300 ease-out motion-safe:hover:-translate-y-1 motion-reduce:hover:translate-y-0";

  /**
   * Hover glow (hue-matched to each icon tile). Pastel rgba in arbitrary shadows often
   * fails in Tailwind (commas inside `rgba()` break parsing) and reads invisible on white.
   * Single layer + 8-digit hex keeps one clear glow.
   */
  const cardHoverGlow1 =
    "hover:shadow-[0_32px_56px_-12px_#8B5CF648] motion-reduce:hover:shadow-none";
  const cardHoverGlow2 =
    "hover:shadow-[0_32px_56px_-12px_#06B6D448] motion-reduce:hover:shadow-none";
  const cardHoverGlow3 =
    "hover:shadow-[0_32px_56px_-12px_#F43F5E48] motion-reduce:hover:shadow-none";

  const stepRowClass = "mb-6 flex items-center gap-3";

  const iconTileClass =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl";

  const stepBadgeBase =
    "inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-black px-4 text-xs font-bold uppercase tracking-wider font-raleway text-gray-900 leading-none shadow-[2px_2px_0_0_rgb(0,0,0)] sm:px-5";

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="container mx-auto px-5 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-16 md:py-24 overflow-x-clip scroll-mt-24"
    >
      <motion.div className="text-center mb-16" style={{ y: headerY }}>
        <h2 className="text-3xl md:text-4xl font-bold mb-4 font-raleway">
          How it Works
        </h2>
        <p className="text-gray-600 text-lg font-roboto">
          Three simple steps from imagination to reality
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-start">

        <motion.div style={{ y: card1Y }} className="will-change-transform min-w-0 w-full">
          <div className={`${neubrutalistCardBase} ${cardHoverGlow1}`}>
            <div className={stepRowClass}>
              <div className={`${iconTileClass} bg-[#F3F0FF] text-[#8B5CF6]`}>
                <PenTool className="h-5 w-5" aria-hidden />
              </div>
              <span className={`${stepBadgeBase} bg-[#e4ddfb]`}>STEP 1</span>
            </div>

            <h3 className="text-2xl font-bold mb-3 font-raleway">
              Sketch your idea
            </h3>

            <p className="text-gray-700 leading-relaxed font-roboto">
              Draw your fashion concept on our intuitive canvas. No artistic
              skills needed—just express your vision.
            </p>
          </div>
        </motion.div>

        <motion.div style={{ y: card2Y }} className="will-change-transform min-w-0 w-full">
          <div className={`${neubrutalistCardBase} ${cardHoverGlow2}`}>
            <div className={stepRowClass}>
              <div className={`${iconTileClass} bg-[#ECFEFF] text-[#06B6D4]`}>
                <Sparkles className="h-5 w-5" aria-hidden />
              </div>
              <span className={`${stepBadgeBase} bg-[#c8e7ff]`}>STEP 2</span>
            </div>

            <h3 className="text-2xl font-bold mb-3 font-raleway">
              AI generates reality
            </h3>

            <p className="text-gray-700 leading-relaxed font-roboto">
              Our advanced Pix2Pix model transforms your sketch into a
              photorealistic garment image in seconds.
            </p>
          </div>
        </motion.div>

        <motion.div style={{ y: card3Y }} className="will-change-transform min-w-0 w-full">
          <div className={`${neubrutalistCardBase} ${cardHoverGlow3}`}>
            <div className={stepRowClass}>
              <div className={`${iconTileClass} bg-[#FFF1F2] text-[#E11D48]`}>
                <ShoppingBag className="h-5 w-5" aria-hidden />
              </div>
              <span className={`${stepBadgeBase} bg-[#ffd6e8]`}>STEP 3</span>
            </div>

            <h3 className="text-2xl font-bold mb-3 font-raleway">
              Discover & shop
            </h3>

            <p className="text-gray-700 leading-relaxed font-roboto">
              Browse visually similar products from real stores and find exactly
              what you imagined.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
