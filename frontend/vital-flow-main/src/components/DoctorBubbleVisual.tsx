import React, { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface DoctorBubbleVisualProps {
  className?: string;
}

export const DoctorBubbleVisual: React.FC<DoctorBubbleVisualProps> = ({ className = "" }) => {
  // Raw mouse coordinates normalized from -1 to 1 relative to viewport center
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  // Ultra-smooth spring physics for head rotation & pupil tracking
  const springConfig = { stiffness: 40, damping: 24, mass: 0.75 };
  const smoothX = useSpring(rawX, springConfig);
  const smoothY = useSpring(rawY, springConfig);

  // 3D Head & Face Tilt Parallax
  const rotateY = useTransform(smoothX, [-1, 1], [-14, 14]);
  const rotateX = useTransform(smoothY, [-1, 1], [10, -10]);
  const translateX = useTransform(smoothX, [-1, 1], [-18, 18]);
  const translateY = useTransform(smoothY, [-1, 1], [-12, 12]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX - innerWidth / 2) / (innerWidth / 2);
      const y = (e.clientY - innerHeight / 2) / (innerHeight / 2);
      rawX.set(Math.max(-1, Math.min(1, x)));
      rawY.set(Math.max(-1, Math.min(1, y)));
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [rawX, rawY]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* ── 1. Outer Glass Bubble Container (Perfect Circle Glass Orb) ───────────── */}
      <div className="relative aspect-square w-full max-w-[500px] h-[500px] sm:max-w-[520px] sm:h-[520px] rounded-full border border-white/80 dark:border-white/20 bg-white/40 dark:bg-slate-900/50 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(37,99,235,0.25)] dark:shadow-[0_25px_70px_-15px_rgba(15,23,42,0.7)] p-6 overflow-hidden flex items-center justify-center transition-all duration-500 hover:shadow-[0_25px_75px_-10px_rgba(37,99,235,0.35)]">
        
        {/* Soft Ambient Inner Radial Glow */}
        <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-blue-400/25 via-sky-300/15 to-white/40 blur-2xl" />

        {/* ── 2. Animated Face & Head 3D Motion Layer ───────────────────────── */}
        <motion.div
          style={{
            rotateX,
            rotateY,
            x: translateX,
            y: translateY,
            perspective: 1000,
          }}
          className="relative w-full h-full flex items-center justify-center"
        >
          {/* Doctors Image with Faded Circle Vignette Blend */}
          <div
            className="relative w-full h-full flex items-center justify-center rounded-full overflow-hidden"
            style={{
              WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 55%, transparent 95%)",
              maskImage: "radial-gradient(circle at 50% 50%, black 55%, transparent 95%)",
            }}
          >
            <img
              src="/doctors.png"
              alt="PulseIQ Medical Team"
              className="relative h-full w-full object-contain mix-blend-multiply dark:mix-blend-normal drop-shadow-xl select-none pointer-events-none scale-105"
            />
          </div>
        </motion.div>

        {/* Glass Sheen Circular Rim Highlight */}
        <div className="pointer-events-none absolute inset-0 rounded-full border border-white/60 dark:border-white/10 bg-gradient-to-b from-white/35 via-transparent to-transparent" />
      </div>
    </div>
  );
};
