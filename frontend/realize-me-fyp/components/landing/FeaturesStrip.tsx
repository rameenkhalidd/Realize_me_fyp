import { PenLine, Sparkles, Shirt } from "lucide-react";

const ITEMS = [
  {
    icon: PenLine,
    title: "Sketch-first canvas",
    description:
      "Draw with shapes, colors, and tools you already know—then export or refine anytime.",
    accent: "text-[#8B5CF6]",
    iconBg: "bg-linear-to-br from-[#F3F0FF] to-[#EDE9FE]",
    iconRing: "ring-violet-200/60",
  },
  {
    icon: Sparkles,
    title: "AI sketch → image",
    description:
      "Turn rough outlines into photorealistic fashion visuals powered by your generate flow.",
    accent: "text-[#0891B2]",
    iconBg: "bg-linear-to-br from-[#ECFEFF] to-[#CFFAFE]",
    iconRing: "ring-cyan-200/60",
  },
  {
    icon: Shirt,
    title: "Shop similar looks",
    description:
      "Jump from a generated design to visually similar pieces from real retailers.",
    accent: "text-[#C026D3]",
    iconBg: "bg-linear-to-br from-[#FAF5FF] to-[#F5D0FE]",
    iconRing: "ring-fuchsia-200/50",
  },
] as const;

type FeaturesStripPanelProps = {
  headingId?: string;
  layout?: "grid" | "stack";
  /** Omit outer card wrapper (e.g. inside a styled modal) */
  embedded?: boolean;
};

export function FeaturesStripPanel({
  headingId = "features-heading",
  layout = "grid",
  embedded = false,
}: FeaturesStripPanelProps) {
  const listClass =
    layout === "stack"
      ? "flex flex-col gap-4"
      : "grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 md:divide-x md:divide-gray-100";

  const itemClass =
    layout === "stack"
      ? "group flex gap-4 rounded-2xl border border-gray-200/60 bg-linear-to-br from-white via-white to-gray-50/90 p-5 shadow-sm transition-all duration-300 hover:border-violet-200/50 hover:shadow-md hover:shadow-violet-500/5"
      : "flex gap-4 md:gap-5 md:px-6 first:md:pl-0 last:md:pr-0 md:first:pl-0";

  const iconWrap =
    layout === "stack"
      ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-inner ring-2 ring-white/80"
      : "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl";

  const header = (
    <div
      className={
        embedded
          ? "mb-6 text-center sm:text-left"
          : "text-center mb-8 md:mb-10"
      }
    >
      <p className="mb-3 font-raleway text-xs font-semibold tracking-wide text-[#8B5CF6]">
        Features
      </p>
      <h2
        id={headingId}
        className="text-xl sm:text-2xl font-bold tracking-tight text-[#1F2937] font-raleway leading-snug"
      >
        Everything you need to go from{" "}
        <span className="bg-linear-to-r from-[#8B5CF6] via-[#D946EF] to-[#06B6D4] bg-clip-text text-transparent">
          idea to outfit
        </span>
      </h2>
    </div>
  );

  const list = (
    <ul className={listClass}>
      {ITEMS.map(({ icon: Icon, title, description, accent, iconBg, iconRing }) => (
        <li key={title} className={itemClass}>
          <div
            className={`${iconWrap} ${iconBg} ${accent} ${layout === "stack" ? iconRing : ""}`}
            aria-hidden
          >
            <Icon className={layout === "stack" ? "h-6 w-6" : "h-5 w-5"} strokeWidth={2} />
          </div>
          <div className="min-w-0 space-y-1.5 pt-0.5">
            <h3 className="text-base font-bold font-raleway text-[#1F2937] leading-snug group-hover:text-[#4C1D95] transition-colors">
              {title}
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed font-roboto">
              {description}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );

  if (embedded) {
    return (
      <div className="space-y-2">
        {header}
        {list}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white/95 px-6 py-8 md:px-10 md:py-10 shadow-sm">
      {header}
      {list}
    </div>
  );
}
