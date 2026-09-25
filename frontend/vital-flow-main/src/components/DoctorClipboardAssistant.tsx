import React, { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ClipboardCheck, Sparkles, CheckCircle2, Edit3 } from "lucide-react";

interface DoctorClipboardAssistantProps {
  filledCount: number;
  totalCount: number;
  activeCellLabel?: string;
  className?: string;
}

export const DoctorClipboardAssistant: React.FC<DoctorClipboardAssistantProps> = ({
  filledCount,
  totalCount,
  activeCellLabel,
  className = "",
}) => {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const springConfig = { stiffness: 45, damping: 22, mass: 0.75 };
  const smoothX = useSpring(rawX, springConfig);
  const smoothY = useSpring(rawY, springConfig);

  // Head tilt & gaze parallax looking at the table
  const rotateY = useTransform(smoothX, [-1, 1], [-12, 12]);
  const rotateX = useTransform(smoothY, [-1, 1], [8, -8]);
  const headX = useTransform(smoothX, [-1, 1], [-10, 10]);
  const headY = useTransform(smoothY, [-1, 1], [-6, 6]);

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

  const progressPct = Math.round((filledCount / totalCount) * 100);

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      {/* ── 1. Speech Bubble Commentary ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        key={activeCellLabel || filledCount}
        className="mb-4 relative rounded-2xl border border-primary/30 bg-white/95 dark:bg-slate-900/95 px-4 py-2.5 shadow-lg backdrop-blur-md max-w-xs text-center z-20"
      >
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-4 w-4 text-primary animate-pulse shrink-0" />
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
            {filledCount === totalCount
              ? "All 28 readings recorded! Ready to train model."
              : activeCellLabel
              ? `Writing ${activeCellLabel} entry to clipboard...`
              : `Reviewing 7-day readings (${filledCount}/${totalCount})`}
          </p>
        </div>
        {/* Speech Bubble Arrow */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[8px] border-t-white/95 dark:border-t-slate-900/95" />
      </motion.div>

      {/* ── 2. Doctor Assistant Card & Animated Clipboard ───────────────────── */}
      <div className="relative w-full max-w-[340px] aspect-[4/5] rounded-3xl border border-white/70 dark:border-white/15 bg-gradient-to-br from-blue-500/10 via-sky-400/5 to-white/40 backdrop-blur-xl p-5 shadow-card overflow-hidden flex flex-col items-center justify-between">
        
        {/* Ambient Glow */}
        <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/20 blur-2xl" />

        {/* Doctor Head & Body with 3D Parallax Tilt (Looking at Table) */}
        <motion.div
          style={{
            rotateX,
            rotateY,
            x: headX,
            y: headY,
          }}
          className="relative w-full flex-1 flex flex-col items-center justify-center"
        >
          {/* Doctor Portrait Artwork */}
          <div className="relative h-44 w-44 rounded-full overflow-hidden border-2 border-white/80 dark:border-white/20 shadow-md bg-gradient-to-b from-blue-100 to-sky-50 dark:from-slate-800 dark:to-slate-900">
            <img
              src="/doctors.png"
              alt="Medical Assistant"
              className="h-full w-full object-cover object-top mix-blend-multiply dark:mix-blend-normal scale-125 translate-y-2"
            />
          </div>
        </motion.div>

        {/* ── 3. Animated Medical Clipboard holding Pen & Writing ─────────────── */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative z-10 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-3.5 shadow-md flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Medical Clipboard</span>
                {filledCount === totalCount ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <motion.div
                    animate={{ rotate: [-10, 10, -10] }}
                    transition={{ duration: 1.0, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Edit3 className="h-3.5 w-3.5 text-primary" />
                  </motion.div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {filledCount} of {totalCount} readings logged
              </p>
            </div>
          </div>

          {/* Writing Pen Motion on Clipboard */}
          <div className="relative flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-lg">
            <motion.div
              animate={filledCount < totalCount ? { x: [-2, 2, -2], y: [-1, 1, -1] } : {}}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="h-2 w-2 rounded-full bg-primary"
            />
            <span className="text-xs font-bold text-primary tnum">{progressPct}%</span>
          </div>
        </motion.div>

      </div>
    </div>
  );
};
