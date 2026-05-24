"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
} from "react";
import { Sparkles, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FeaturesStripPanel } from "./FeaturesStrip";
import { INTERACTIVE_BUTTON_MOTION } from "@/lib/interactive-button-motion";

type Ctx = { openFeatures: () => void };

const FeaturesModalContext = createContext<Ctx | undefined>(undefined);

export function useFeaturesModal() {
  const ctx = useContext(FeaturesModalContext);
  if (!ctx) {
    throw new Error("useFeaturesModal must be used within FeaturesModalProvider");
  }
  return ctx;
}

export function FeaturesModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const openFeatures = useCallback(() => setOpen(true), []);
  const closeFeatures = useCallback(() => setOpen(false), []);
  const titleId = useId();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFeatures();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, closeFeatures]);

  const instant = reduceMotion ? { duration: 0 } : undefined;

  return (
    <FeaturesModalContext.Provider value={{ openFeatures }}>
      {children}
      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-100 flex items-end justify-center sm:items-center sm:p-5"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
            transition={instant ?? { duration: 0.22 }}
            aria-hidden={false}
          >
            <button
              type="button"
              className="absolute inset-0 bg-[#0F1115]/55 backdrop-blur-md"
              aria-label="Close features dialog"
              onClick={closeFeatures}
            />

            <motion.div
              key="features-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              initial={reduceMotion ? false : { opacity: 0, y: 48, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 28, scale: 0.98 }
              }
              transition={
                instant ?? { type: "spring", stiffness: 380, damping: 32 }
              }
              className="relative z-10 flex max-h-[min(92vh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-white/20 bg-linear-to-b from-white via-[#FAFBFF] to-[#F3F0FF]/90 shadow-[0_32px_90px_-20px_rgba(91,33,182,0.35)] ring-1 ring-violet-500/10 sm:max-w-xl sm:rounded-3xl"
            >
              <div
                className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[min(100%,28rem)] -translate-x-1/2 rounded-full bg-linear-to-r from-[#8B5CF6]/25 via-[#D946EF]/20 to-[#06B6D4]/25 blur-3xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -right-16 top-1/3 h-40 w-40 rounded-full bg-cyan-400/15 blur-3xl"
                aria-hidden
              />

              <div className="relative flex items-start justify-between gap-4 border-b border-violet-100/80 bg-white/70 px-5 py-4 backdrop-blur-md sm:px-6 sm:py-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-[#8B5CF6] to-[#06B6D4] text-white shadow-lg shadow-violet-500/25">
                    <Sparkles className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-raleway text-[11px] font-semibold tracking-wide text-violet-600/90">
                      RealizeMe
                    </p>
                    <p className="truncate text-base font-bold text-[#1F2937] font-raleway sm:text-lg">
                      What you can do here
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeFeatures}
                  className={`shrink-0 rounded-xl p-2.5 text-gray-500 hover:bg-violet-50 hover:text-violet-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 ${INTERACTIVE_BUTTON_MOTION}`}
                  aria-label="Close"
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>

              <div className="relative overflow-y-auto overscroll-contain px-5 py-6 sm:px-7 sm:py-8">
                <FeaturesStripPanel
                  headingId={titleId}
                  layout="stack"
                  embedded
                />
              </div>

              <div className="relative border-t border-violet-100/60 bg-linear-to-r from-violet-50/40 via-white/80 to-cyan-50/40 px-5 py-3 text-center sm:px-6">
                <p className="text-xs text-gray-600 font-roboto">
                  Tip: start on the canvas anytime — no signup required to try sketching.
                </p>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </FeaturesModalContext.Provider>
  );
}
