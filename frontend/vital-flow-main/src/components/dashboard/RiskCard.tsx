import { motion } from "framer-motion";
import { Shield, AlertTriangle, TrendingDown } from "lucide-react";
import { useGlucoseStore } from "@/store/glucoseStore";
import { SpotlightCard } from "@/components/SpotlightCard";

const map = {
  normal: {
    label: "Stable",
    sub: "All systems calm",
    icon: Shield,
    bg: "from-glucose-normal/15 to-glucose-normal/5",
    text: "text-glucose-normal",
    ring: "ring-glucose-normal/30",
  },
  low: {
    label: "Caution",
    sub: "Glucose trending low",
    icon: TrendingDown,
    bg: "from-glucose-low/20 to-glucose-low/5",
    text: "text-glucose-low",
    ring: "ring-glucose-low/30",
  },
  high: {
    label: "High risk",
    sub: "Elevated levels detected",
    icon: AlertTriangle,
    bg: "from-glucose-high/20 to-glucose-high/5",
    text: "text-glucose-high",
    ring: "ring-glucose-high/30",
  },
};

export function RiskCard() {
  const state = useGlucoseStore((s) => s.state);
  const meta = map[state];
  const Icon = meta.icon;

  return (
    <SpotlightCard className={`bg-gradient-to-br ${meta.bg} ring-1 ${meta.ring} min-h-[140px] w-full`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Risk status</p>
          <h3 className={`mt-2 font-display text-3xl font-semibold ${meta.text}`}>{meta.label}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{meta.sub}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-card/60 backdrop-blur ${meta.text}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </SpotlightCard>
  );
}
