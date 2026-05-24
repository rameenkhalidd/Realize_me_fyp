import type { ButtonHTMLAttributes, ReactNode } from "react";
import { INTERACTIVE_BUTTON_MOTION } from "@/lib/interactive-button-motion";

type ButtonVariant = "default" | "gradient" | "ghost" | "secondary";
type ButtonSize = "default" | "sm" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

export function Button({
  variant = "default",
  size = "default",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base = `inline-flex items-center justify-center rounded-full text-sm font-medium ${INTERACTIVE_BUTTON_MOTION} focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none`;

  const variants: Record<ButtonVariant, string> = {
    default: "bg-[#1F2937] text-white hover:bg-[#1F2937]/90",
    gradient:
      "bg-gradient-to-r from-[#8B5CF6] via-[#D946EF] to-[#06B6D4] text-white shadow-lg hover:opacity-90 hover:shadow-xl",
    ghost: "text-[#1F2937] hover:bg-gray-100",
    secondary:
      "bg-white text-[#1F2937] shadow-sm border border-gray-200 hover:bg-gray-50",
  };

  const sizes: Record<ButtonSize, string> = {
    default: "h-10 px-5",
    sm: "h-9 px-3",
    lg: "h-14 px-10 text-base",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
