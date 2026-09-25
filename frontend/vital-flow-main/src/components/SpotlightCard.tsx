import React, { useRef, useState } from "react";
import { motion, useSpring } from "framer-motion";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  borderColor?: string;
  enableTilt?: boolean;
}

export function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(59, 130, 246, 0.12)",
  borderColor = "rgba(59, 130, 246, 0.55)",
  enableTilt = true,
  ...props
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  // 3D Tilt motion springs
  const rotateX = useSpring(0, { stiffness: 280, damping: 20 });
  const rotateY = useSpring(0, { stiffness: 280, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPosition({ x, y });

    if (enableTilt) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      // Calculate tilt angles max ~5.5 degrees
      const tiltX = ((y - centerY) / centerY) * -5.5;
      const tiltY = ((x - centerX) / centerX) * 5.5;

      rotateX.set(tiltX);
      rotateY.set(tiltY);
    }
  };

  const handleMouseEnter = () => setOpacity(1);

  const handleMouseLeave = () => {
    setOpacity(0);
    if (enableTilt) {
      rotateX.set(0);
      rotateY.set(0);
    }
  };

  return (
    <motion.div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={
        enableTilt
          ? {
              rotateX,
              rotateY,
              transformStyle: "preserve-3d",
              perspective: 1000,
            }
          : {}
      }
      className={`group relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-6 shadow-soft transition-shadow duration-300 hover:shadow-xl ${className}`}
      {...props}
    >
      {/* 1. Mouse-following Radial Background Glow */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(500px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 70%)`,
        }}
      />

      {/* 2. Mouse-following Spotlight Border Highlight */}
      <div
        className="pointer-events-none absolute -inset-[1px] rounded-[24px] transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(350px circle at ${position.x}px ${position.y}px, ${borderColor}, transparent 80%)`,
          mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
          padding: "1px",
        }}
      />

      {/* 3. Card Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
