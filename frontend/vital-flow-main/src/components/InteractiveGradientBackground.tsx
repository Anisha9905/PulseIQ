import React, { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface InteractiveGradientBackgroundProps {
  children?: React.ReactNode;
  className?: string;
}

export function InteractiveGradientBackground({ children, className = "" }: InteractiveGradientBackgroundProps) {
  // Raw mouse coordinates normalized from -1 to 1
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  // Soft continuous spring physics for ultra-smooth movement
  const springConfig = { stiffness: 35, damping: 25, mass: 0.8 };
  const smoothX = useSpring(rawX, springConfig);
  const smoothY = useSpring(rawY, springConfig);

  // Smooth parallax offsets
  const orb1X = useTransform(smoothX, [-1, 1], [-70, 70]);
  const orb1Y = useTransform(smoothY, [-1, 1], [-70, 70]);

  const orb2X = useTransform(smoothX, [-1, 1], [80, -80]);
  const orb2Y = useTransform(smoothY, [-1, 1], [80, -80]);

  const orb3X = useTransform(smoothX, [-1, 1], [-40, 40]);
  const orb3Y = useTransform(smoothY, [-1, 1], [-40, 40]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX - innerWidth / 2) / (innerWidth / 2);
      const y = (e.clientY - innerHeight / 2) / (innerHeight / 2);
      rawX.set(x);
      rawY.set(y);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [rawX, rawY]);

  return (
    <div className={`relative min-h-screen overflow-hidden bg-aurora ${className}`}>
      {/* ── 1. Primary White-Blue Ambient Orb (Top-Left Parallax) ───────────────── */}
      <motion.div
        style={{
          x: orb1X,
          y: orb1Y,
        }}
        className="pointer-events-none fixed -top-32 -left-32 z-0 h-[650px] w-[650px] rounded-full bg-gradient-to-br from-blue-300/35 via-blue-500/20 to-transparent blur-3xl dark:from-blue-600/30 dark:via-indigo-600/20"
      />

      {/* ── 2. Secondary Ice Blue Orb (Bottom-Right Counter-Parallax) ──────────── */}
      <motion.div
        style={{
          x: orb2X,
          y: orb2Y,
        }}
        className="pointer-events-none fixed -bottom-40 -right-40 z-0 h-[750px] w-[750px] rounded-full bg-gradient-to-tl from-sky-200/40 via-blue-400/25 to-white/10 blur-3xl dark:from-blue-800/25 dark:via-slate-800/40"
      />

      {/* ── 3. Central Dynamic Spotlight (Cursor Follower) ────────────────────── */}
      <motion.div
        style={{
          x: orb3X,
          y: orb3Y,
        }}
        className="pointer-events-none fixed top-1/2 left-1/2 z-0 h-[550px] w-[550px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-radial from-blue-400/20 via-sky-300/15 to-transparent blur-3xl dark:from-blue-500/15 dark:to-transparent"
      />

      {/* ── 4. Main Page Content ──────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col min-h-screen">{children}</div>
    </div>
  );
}
