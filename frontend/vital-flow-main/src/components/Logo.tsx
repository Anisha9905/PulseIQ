import React from "react";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({ size = "md", className = "", onClick }) => {
  const iconSizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const activitySizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div onClick={onClick} className={`flex items-center gap-3 group cursor-pointer ${className}`}>
      {/* Icon Badge Container with Animated Glow Aura & Heartbeat */}
      <div className="relative">
        {/* Soft Animated Glow Aura */}
        <motion.div
          animate={{
            scale: [0.95, 1.18, 0.95],
            opacity: [0.35, 0.7, 0.35],
          }}
          transition={{
            duration: 2.8,
            ease: "easeInOut",
            repeat: Infinity,
          }}
          className={`absolute inset-0 rounded-2xl bg-primary/40 blur-md ${iconSizes[size]}`}
        />

        {/* Pulse Heartbeat Badge */}
        <motion.div
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-blue-600 to-primary-glow text-white shadow-soft ring-1 ring-primary/30 ${iconSizes[size]}`}
        >
          {/* Subtle Heartbeat Pulse Animation on Activity Icon */}
          <motion.div
            animate={{
              scale: [1, 1.16, 1, 1.08, 1],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Activity className={`${activitySizes[size]} transition-transform duration-300 group-hover:rotate-6`} />
          </motion.div>
        </motion.div>
      </div>

      {/* Brand Text */}
      <span className={`font-display font-bold tracking-tight text-slate-900 dark:text-white transition-colors group-hover:text-primary ${textSizes[size]}`}>
        Pulse<span className="text-primary">IQ</span>
      </span>
    </div>
  );
};
