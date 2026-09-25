import { motion } from "framer-motion";
import { useGlucoseStore } from "@/store/glucoseStore";
import { SpotlightCard } from "@/components/SpotlightCard";

export function CalibrationCard() {
  const calibration = useGlucoseStore((s) => s.calibration);
  const message =
    calibration < 40
      ? "Learning your baseline…"
      : calibration < 80
      ? "Refining model accuracy by the model"
      : calibration < 100
      ? "Almost calibrated"
      : "Fully calibrated";

  return (
    <SpotlightCard className="min-h-[140px] w-full flex flex-col justify-between">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Calibration</p>
          <h3 className="mt-1 font-display text-base font-semibold">{message}</h3>
        </div>
        <span className="text-display tnum text-2xl font-semibold text-primary">{calibration}%</span>
      </div>

      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={false}
          animate={{ width: `${calibration}%` }}
          transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow"
        />
        <div className="absolute inset-0 animate-shimmer rounded-full bg-[linear-gradient(90deg,transparent,hsl(var(--primary-foreground)/0.3),transparent)] bg-[length:200%_100%]" />
      </div>
    </SpotlightCard>
  );
}
