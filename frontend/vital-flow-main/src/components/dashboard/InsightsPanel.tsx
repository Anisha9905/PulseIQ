import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useGlucoseStore } from "@/store/glucoseStore";

export function InsightsPanel() {
  const insights = useGlucoseStore((s) => s.insights);
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-7">
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <h3 className="font-display text-base font-semibold">AI Insights</h3>
      </div>

      <ul className="space-y-3">
        {insights.map((text, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="group flex gap-3 rounded-2xl border border-transparent bg-accent/40 p-4 transition-smooth hover:border-border hover:bg-accent/70"
          >
            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
            <p className="text-sm leading-relaxed text-foreground/85">{text}</p>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
