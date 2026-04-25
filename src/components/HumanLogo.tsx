"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

interface HumanLogoProps {
  logoUrl: string;
  siteName: string;
}

export default function HumanLogo({ logoUrl, siteName }: HumanLogoProps) {
  const nameWords = siteName.split(" ");
  const firstWord = nameWords[0] || "TTC";
  const restWords = nameWords.slice(1).join(" ") || "Network";

  return (
    <Link href="/" className="flex items-center gap-3 group relative">
      {/* Hand-Drawn Emblem Container */}
      <div className="relative flex-shrink-0">
        <motion.div
           initial={{ rotate: -10, scale: 0.9 }}
           whileHover={{ rotate: 0, scale: 1.05 }}
           transition={{ type: "spring", stiffness: 400, damping: 10 }}
           className="relative w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center"
        >
          {/* Animated Hand-Drawn Ring */}
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
          >
            <motion.circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="text-accent/40"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }}
              style={{
                filter: "drop-shadow(0 0 2px rgba(230, 57, 70, 0.2))",
                strokeDasharray: "10 5" // Optional: makes it look slightly dashed like a sketch
              }}
            />
            {/* Inner more solid ring */}
            <motion.circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-primary/20 dark:text-blue-400/20"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, ease: "easeInOut", delay: 0.5 }}
            />
          </svg>

          {/* Logo Image */}
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border border-gray-100 dark:border-white/10 p-0.5 bg-white dark:bg-gray-800">
            <Image
              src={logoUrl}
              alt={siteName}
              fill
              className="object-contain"
              priority
            />
          </div>
        </motion.div>
      </div>

      {/* Styled Human Typography */}
      <div className="flex flex-col -space-y-1.5 sm:-space-y-2">
        <motion.span
          className="text-xl sm:text-2xl font-black tracking-tighter font-english"
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{
            background: "linear-gradient(to right, #1a5276, #1D9BF0)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {firstWord}
        </motion.span>
        
        <motion.span
          className="text-lg sm:text-xl font-handwritten tracking-normal text-accent dark:text-red-400"
          initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, delay: 0.6, type: "spring" }}
        >
          {restWords}
        </motion.span>
      </div>

      {/* Modern Shimmer Effect Overlay */}
      <motion.div
        className="absolute -inset-x-2 -inset-y-1 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
        initial={{ x: "-100%" }}
        whileHover={{ x: "100%" }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      />
    </Link>
  );
}
