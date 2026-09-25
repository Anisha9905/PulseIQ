import { motion, AnimatePresence } from "framer-motion";
import { GlucoseOrb } from "@/components/GlucoseOrb";
import { useGlucoseStore } from "@/store/glucoseStore";

const stateLabels = {
  normal: { label: "In range", color: "text-glucose-normal", description: "Your levels are stable." },
  low: { label: "Trending low", color: "text-glucose-low", description: "Consider a light snack." },
  high: { label: "Elevated", color: "text-glucose-high", description: "Hydrate & monitor closely." },
};

export function HeroOrb() {
  const current = useGlucoseStore((s) => s.current);
  const state = useGlucoseStore((s) => s.state);
  const meta = stateLabels[state];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card to-accent/40 p-8 shadow-card sm:p-10 card-hover">
      <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto] sm:gap-10">
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full bg-current ${meta.color}`} />
            <span className={`text-xs font-medium uppercase tracking-wider ${meta.color}`}>
              {meta.label}
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={current}
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -12, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                  className="text-display tnum text-7xl font-semibold tracking-tighter sm:text-8xl"
                >
                  {current}
                </motion.span>
              </AnimatePresence>
              <span className="text-base text-muted-foreground">mg/dL</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">{meta.description}</p>
          </div>
        </div>

        <div className="relative h-[260px] w-[260px] sm:h-[300px] sm:w-[300px]">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-glow/20 to-transparent blur-2xl" />
          <GlucoseOrb state={state} className="relative h-full w-full" />
        </div>
      </div>
    </div>
  );
}
