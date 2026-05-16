"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "../lib/utils";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

export function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 backdrop-blur-md shadow-xl",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
