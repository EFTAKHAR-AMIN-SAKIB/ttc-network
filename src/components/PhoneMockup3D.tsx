"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export type TiltVariant =
  | "hero"
  | "stories"
  | "colleges"
  | "learn"
  | "card-01"
  | "card-02"
  | "card-03"
  | "card-04"
  | "flat";

export interface PhoneMockup3DProps {
  imageSrc: string;
  alt: string;
  tiltVariant?: TiltVariant;
  isHovered?: boolean;
  priority?: boolean;
  className?: string;
  sizes?: string;
  overrideScale?: number;
  overrideYOffset?: number;
}

const TILT_CONFIGS: Record<
  string,
  {
    rotateY: number;
    rotateX: number;
    rotateZ: number;
    scale: number;
    yOffset: number;
    shadowWidth: string;
    shadowOpacity: number;
  }
> = {
  hero: {
    rotateY: -7,
    rotateX: 4,
    rotateZ: -1.5,
    scale: 1.0, // Phone 1 (Hero): ~100% scale
    yOffset: 0,
    shadowWidth: "90%",
    shadowOpacity: 0.55,
  },
  stories: {
    rotateY: 8,
    rotateX: 5,
    rotateZ: 1.5,
    scale: 0.83, // Phone 2: ~83% scale, lower
    yOffset: 24,
    shadowWidth: "82%",
    shadowOpacity: 0.48,
  },
  colleges: {
    rotateY: -6,
    rotateX: 4,
    rotateZ: -1,
    scale: 0.88, // Phone 3: ~88% scale, elevated
    yOffset: -12,
    shadowWidth: "85%",
    shadowOpacity: 0.50,
  },
  learn: {
    rotateY: 9,
    rotateX: 6,
    rotateZ: 2,
    scale: 0.74, // Phone 4: ~74% scale, receding
    yOffset: 28,
    shadowWidth: "75%",
    shadowOpacity: 0.42,
  },
  "card-01": {
    rotateY: -7,
    rotateX: 4,
    rotateZ: -1.5,
    scale: 1.0,
    yOffset: 0,
    shadowWidth: "90%",
    shadowOpacity: 0.55,
  },
  "card-02": {
    rotateY: 8,
    rotateX: 5,
    rotateZ: 1.5,
    scale: 0.83,
    yOffset: 24,
    shadowWidth: "82%",
    shadowOpacity: 0.48,
  },
  "card-03": {
    rotateY: -6,
    rotateX: 4,
    rotateZ: -1,
    scale: 0.88,
    yOffset: -12,
    shadowWidth: "85%",
    shadowOpacity: 0.50,
  },
  "card-04": {
    rotateY: 9,
    rotateX: 6,
    rotateZ: 2,
    scale: 0.74,
    yOffset: 28,
    shadowWidth: "75%",
    shadowOpacity: 0.42,
  },
  flat: {
    rotateY: 0,
    rotateX: 0,
    rotateZ: 0,
    scale: 1.0,
    yOffset: 0,
    shadowWidth: "85%",
    shadowOpacity: 0.45,
  },
};

export default function PhoneMockup3D({
  imageSrc,
  alt,
  tiltVariant = "flat",
  isHovered = false,
  priority = false,
  className = "",
  sizes = "(max-width: 768px) 80vw, (max-width: 1200px) 25vw, 280px",
  overrideScale,
  overrideYOffset,
}: PhoneMockup3DProps) {
  const config = TILT_CONFIGS[tiltVariant] || TILT_CONFIGS.flat;
  const targetScale = overrideScale !== undefined ? overrideScale : config.scale;
  const targetYOffset = overrideYOffset !== undefined ? overrideYOffset : config.yOffset;

  return (
    <div
      className={`w-full relative flex flex-col items-center select-none ${className}`}
      style={{ perspective: 1200 }}
    >
      <motion.div
        animate={{
          rotateY: isHovered ? 0 : config.rotateY,
          rotateX: isHovered ? 0 : config.rotateX,
          rotateZ: isHovered ? 0 : config.rotateZ,
          scale: isHovered ? targetScale * 1.03 : targetScale,
          y: isHovered ? targetYOffset - 10 : targetYOffset,
        }}
        whileHover={{
          rotateY: 0,
          rotateX: 0,
          rotateZ: 0,
          scale: targetScale * 1.03,
          y: targetYOffset - 10,
        }}
        transition={{
          type: "spring",
          stiffness: 280,
          damping: 26,
        }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative w-[210px] sm:w-[230px] md:w-[190px] lg:w-[240px] xl:w-[265px] max-w-full cursor-pointer mx-auto"
      >
        {/* Hardware Side Buttons */}
        {/* Left: Mute Switch & Volume Rockers */}
        <div className="absolute -left-[3.5px] top-[64px] w-[3.5px] h-[16px] bg-[#2d3440] border-l border-[#424b5a] rounded-l-xs shadow-xs" />
        <div className="absolute -left-[3.5px] top-[96px] w-[3.5px] h-[32px] bg-[#2d3440] border-l border-[#424b5a] rounded-l-xs shadow-xs" />
        <div className="absolute -left-[3.5px] top-[138px] w-[3.5px] h-[32px] bg-[#2d3440] border-l border-[#424b5a] rounded-l-xs shadow-xs" />

        {/* Right: Power / Lock Button */}
        <div className="absolute -right-[3.5px] top-[108px] w-[3.5px] h-[48px] bg-[#2d3440] border-r border-[#424b5a] rounded-r-xs shadow-xs" />

        {/* Outer Phone Chassis - Satin Graphite / Dark Titanium */}
        <div className="relative w-full p-[7px] sm:p-[8.5px] rounded-[38px] sm:rounded-[42px] bg-gradient-to-b from-[#2e3542] via-[#1a1f28] to-[#0c0f14] border border-slate-700/60 shadow-[0_0_0_1px_rgba(255,255,255,0.12)_inset,0_20px_44px_-10px_rgba(0,0,0,0.45)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset,0_24px_50px_-12px_rgba(0,0,0,0.85)]">
          {/* Inner Screen Bezel with curved corners */}
          <div
            className="relative w-full rounded-[31px] sm:rounded-[34px] overflow-hidden bg-slate-950"
            style={{ aspectRatio: "9 / 19.5", minHeight: "360px" }}
          >
            {/* Dynamic Island Pill Notch */}
            <div className="absolute top-[6px] sm:top-[7px] left-1/2 -translate-x-1/2 w-[50px] sm:w-[54px] h-[12px] sm:h-[13px] bg-[#0c0d10] rounded-full z-30 shadow-[0_1px_3px_rgba(0,0,0,0.7)] border border-white/[0.07] pointer-events-none flex items-center justify-between px-2 overflow-hidden">
              {/* Subtle Face ID sensor dot on the left */}
              <div className="w-[3px] h-[3px] rounded-full bg-[#1a1b20]" />

              {/* Front Camera Lens with blue antireflective coating */}
              <div className="w-[5.5px] h-[5.5px] rounded-full bg-[#050811] border border-[#1b253b]/80 flex items-center justify-center relative">
                <div className="w-[2px] h-[2px] rounded-full bg-blue-500/80" />
              </div>
            </div>

            {/* Screen Screenshot Graphic */}
            <Image
              src={imageSrc}
              alt={alt}
              fill
              sizes={sizes}
              priority={priority}
              className="object-cover object-top pointer-events-none select-none"
            />

            {/* Restrained Studio Glass Reflection Sheen */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.06] to-transparent pointer-events-none z-20" />

            {/* Subtle Screen Inner Edge Rim */}
            <div className="absolute inset-0 ring-1 ring-inset ring-black/15 rounded-[31px] sm:rounded-[34px] pointer-events-none z-20" />
          </div>
        </div>
      </motion.div>

      {/* Ground Studio Floor Shadow underneath the phone */}
      <motion.div
        animate={{
          width: isHovered ? "92%" : config.shadowWidth,
          opacity: isHovered ? config.shadowOpacity + 0.15 : config.shadowOpacity,
          scale: isHovered ? 1.06 : 1,
          y: isHovered ? 2 : 0,
        }}
        transition={{ duration: 0.3 }}
        className="h-5 bg-gradient-to-r from-slate-950/0 via-slate-950/65 to-slate-950/0 dark:via-blue-950/70 rounded-full blur-xl -mt-2.5 pointer-events-none"
      />
    </div>
  );
}

