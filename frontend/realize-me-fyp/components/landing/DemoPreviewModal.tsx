"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "../ui/button";
import { INTERACTIVE_BUTTON_MOTION } from "@/lib/interactive-button-motion";

type DemoPreviewModalProps = {
  open: boolean;
  onClose: () => void;
};

export function DemoPreviewModal({ open, onClose }: DemoPreviewModalProps) {
  const reduceMotion = useReducedMotion() === true;
  const instant = reduceMotion ? { duration: 0 } : undefined;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={instant ?? { duration: 0.2 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#0F1115]/45 backdrop-blur-sm"
            aria-label="Close demo preview"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-preview-title"
            aria-describedby="demo-preview-desc"
            initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.99 }}
            transition={instant ?? { type: "spring", stiffness: 420, damping: 34 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-[0_24px_64px_-16px_rgba(15,17,21,0.18)]"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-[#8B5CF6] via-[#D946EF] to-[#06B6D4]" aria-hidden />

            <div className="flex items-center justify-end border-b border-gray-100 px-4 py-3">
              <button
                type="button"
                onClick={onClose}
                className={`rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 ${INTERACTIVE_BUTTON_MOTION}`}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 pb-6 pt-5 text-center">
              <h2
                id="demo-preview-title"
                className="text-xl font-bold font-raleway text-[#1F2937] tracking-tight"
              >
                Demo coming soon
              </h2>
              <p
                id="demo-preview-desc"
                className="mt-2 text-sm leading-relaxed text-gray-700 font-roboto"
              >
                We&apos;re recording a short walkthrough of the canvas and AI flow. In the
                meantime, you can jump in and try sketching—no setup required.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link href="/demo" className="w-full sm:w-auto" onClick={onClose}>
                  <Button variant="gradient" size="lg" className="w-full font-raleway font-semibold sm:w-auto">
                    Start sketching
                  </Button>
                </Link>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="w-full font-roboto sm:w-auto"
                  onClick={onClose}
                >
                  Close
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
