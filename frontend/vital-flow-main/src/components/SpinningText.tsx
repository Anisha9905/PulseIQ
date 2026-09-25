import React from "react";
import { motion } from "framer-motion";

interface SpinningTextProps {
  text?: string;
  radius?: number;
  fontSize?: number;
  className?: string;
  duration?: number;
  children?: React.ReactNode;
}

export function SpinningText({
  text = "PHYSICAL ESP32 BOARD • HARDWARE SYNC • ",
  radius = 50,
  fontSize = 11,
  className = "",
  duration = 12,
  children,
}: SpinningTextProps) {
  const characters = text.split("");
  const totalChars = characters.length;
  const viewBoxSize = radius * 2 + 40;
  const center = viewBoxSize / 2;
  const pathRadius = radius;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* 360 degree Rotating SVG text ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration, repeat: Infinity, ease: "linear" }}
        className="h-full w-full flex items-center justify-center"
      >
        <svg
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          className="h-full w-full pointer-events-none"
        >
          <defs>
            <path
              id="spinning-text-circle"
              d={`M ${center},${center} m -${pathRadius},0 a ${pathRadius},${pathRadius} 0 1,1 ${pathRadius * 2},0 a ${pathRadius},${pathRadius} 0 1,1 -${pathRadius * 2},0`}
            />
          </defs>
          <text
            fill="currentColor"
            className="text-[10px] font-semibold tracking-widest uppercase fill-primary/80 dark:fill-primary-glow/90"
            style={{ fontSize: `${fontSize}px` }}
          >
            <textPath xlinkHref="#spinning-text-circle" startOffset="0%">
              {text}
            </textPath>
          </text>
        </svg>
      </motion.div>

      {/* Optional Inner Center Content (e.g., Icon or Badge) */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
          {children}
        </div>
      )}
    </div>
  );
}
