import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export const SpotlightCursor: React.FC = () => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);

  const rawX = useMotionValue(-100);
  const rawY = useMotionValue(-100);

  const cursorX = useSpring(rawX, { stiffness: 250, damping: 25 });
  const cursorY = useSpring(rawY, { stiffness: 250, damping: 25 });

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      rawX.set(e.clientX);
      rawY.set(e.clientY);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest("a") ||
        target.closest(".card-hover") ||
        target.closest(".glass")
      ) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    window.addEventListener("mousemove", updatePosition);
    window.addEventListener("mouseover", handleMouseOver);

    return () => {
      window.removeEventListener("mousemove", updatePosition);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, [rawX, rawY]);

  return (
    <>
      {/* ── 1. Full-Screen Radial Ambient Spotlight Overlay ───────────────── */}
      <div
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
        style={{
          background: `radial-gradient(650px circle at ${position.x}px ${position.y}px, rgba(37, 99, 235, 0.07), transparent 75%)`,
        }}
      />

      {/* ── 2. Floating Sleek Spotlight Cursor Ring ───────────────────────── */}
      <motion.div
        style={{
          x: cursorX,
          y: cursorY,
        }}
        animate={{
          scale: isHovered ? 1.6 : 1,
          opacity: isHovered ? 0.8 : 0.4,
        }}
        transition={{ duration: 0.2 }}
        className="pointer-events-none fixed -top-4 -left-4 z-50 h-8 w-8 rounded-full border border-primary/50 bg-primary/10 shadow-[0_0_15px_rgba(37,99,235,0.3)] backdrop-blur-[1px]"
      />
    </>
  );
};
