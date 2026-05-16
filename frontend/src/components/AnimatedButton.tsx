"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "../lib/utils";

interface AnimatedButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline";
}

export function AnimatedButton({ children, className, variant = "primary", ...props }: AnimatedButtonProps) {
  const baseStyles = "px-6 py-3 rounded-full font-semibold transition-colors flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-lg shadow-emerald-500/20",
    secondary: "bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm",
    outline: "border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}
