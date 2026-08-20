import { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-electric-blue text-white shadow shadow-blue-500/30 hover:bg-blue-500 disabled:hover:bg-electric-blue",
  secondary:
    "border border-white/15 bg-white/5 text-zinc-100 hover:bg-white/10",
  danger: "bg-red-500/90 text-white shadow shadow-red-500/30 hover:bg-red-500",
  ghost: "text-zinc-300 hover:bg-white/10",
};

export function buttonClasses(variant: ButtonVariant = "primary", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    VARIANT_CLASSES[variant],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return <button className={buttonClasses(variant, className)} {...props} />;
}
