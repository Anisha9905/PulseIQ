import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Thermometer, Brain, Wind, Activity as ActivityIcon, Sparkles, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useGlucoseStore } from "@/store/glucoseStore";

export function HealthScoreCard() {
  const healthScore = useGlucoseStore((s) => s.healthScore);
  const healthCategory = useGlucoseStore((s) => s.healthCategory);
  const healthExplanation = useGlucoseStore((s) => s.healthExplanation);
  const healthRecommendations = useGlucoseStore((s) => s.healthRecommendations);

  const heartRate = useGlucoseStore((s) => s.heartRate);
  const temperature = useGlucoseStore((s) => s.temperature);
  const stress = useGlucoseStore((s) => s.stress);
  const spo2 = useGlucoseStore((s) => s.spo2);
  const activity = useGlucoseStore((s) => s.activity);
  const confidence = useGlucoseStore((s) => s.confidence);
  const trend = useGlucoseStore((s) => {
    const readings = s.trend;
    if (readings.length < 2) return "stable";
    const last = readings[readings.length - 1].value;
    const prev = readings[readings.length - 2].value;
    const diff = last - prev;
    return diff > 3 ? "rising" : diff < -3 ? "falling" : "stable";
  });

  const [expanded, setExpanded] = useState(false);

  // Category styles
  const categoryStyles: Record<string, { ring: string; text: string; bg: string; dot: string }> = {
    Excellent: {
      ring: "ring-emerald-500/20 border-emerald-500/30",
      text: "text-emerald-400",
      bg: "from-emerald-950/20 via-emerald-950/5 to-transparent",
      dot: "bg-emerald-400"
    },
    Good: {
      ring: "ring-teal-500/20 border-teal-500/30",
      text: "text-teal-400",
      bg: "from-teal-950/20 via-teal-950/5 to-transparent",
      dot: "bg-teal-400"
    },
    Moderate: {
      ring: "ring-amber-500/20 border-amber-500/30",
      text: "text-amber-400",
      bg: "from-amber-950/20 via-amber-950/5 to-transparent",
      dot: "bg-amber-400"
    },
    "Needs Attention": {
      ring: "ring-orange-500/20 border-orange-500/30",
      text: "text-orange-400",
      bg: "from-orange-950/20 via-orange-950/5 to-transparent",
      dot: "bg-orange-400"
    },
    "High Risk": {
      ring: "ring-red-500/20 border-red-500/30",
      text: "text-red-400",
      bg: "from-red-950/20 via-red-950/5 to-transparent",
      dot: "bg-red-400"
    }
  };

  const style = categoryStyles[healthCategory] || categoryStyles.Excellent;

  // SVG parameters for progress ring (scaled down to h-14 w-14 footprint)
  const radius = 24;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (healthScore / 100) * circumference;

  return (
    <motion.div
      layout
      className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br ${style.bg} p-4 sm:p-5 shadow-soft ring-1 ${style.ring} h-full w-full flex flex-col justify-between`}
    >
      <div className="flex flex-col gap-3">
        {/* Top Row: Gauge & Category */}
        <div className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Scaled down Progress Ring */}
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
              <svg className="h-full w-full -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r={radius}
                  className="stroke-muted/30"
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                <motion.circle
                  cx="28"
                  cy="28"
                  r={radius}
                  className="stroke-primary"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <div className="absolute font-display text-sm font-bold tracking-tight text-foreground">
                {healthScore}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground leading-none">AI Health Score</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                <h3 className={`font-display text-sm font-bold leading-tight ${style.text}`}>
                  {healthCategory}
                </h3>
              </div>
            </div>
          </div>

          {/* Confidence Indicator */}
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground leading-none">Confidence</p>
            <div className="mt-1 flex items-center justify-end gap-0.5 text-xs font-semibold text-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              {confidence}%
            </div>
          </div>
        </div>

        {/* Tightly packed Grid of Vitals */}
        <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-border/20 pt-2.5 sm:grid-cols-3">
          <VitalItem
            icon={Heart}
            label="Heart Rate"
            value={`${heartRate} bpm`}
            status={heartRate > 90 ? "warning" : heartRate < 60 ? "info" : "normal"}
          />
          <VitalItem
            icon={Thermometer}
            label="Temperature"
            value={`${temperature}°C`}
            status={temperature > 37.2 ? "warning" : "normal"}
          />
          <VitalItem
            icon={Brain}
            label="Stress Level"
            value={stress}
            status={stress === "high" ? "critical" : stress === "moderate" ? "warning" : "normal"}
          />
          <VitalItem
            icon={Wind}
            label="SpO₂"
            value={`${spo2}%`}
            status={spo2 < 95 ? "critical" : "normal"}
          />
          <VitalItem
            icon={ActivityIcon}
            label="Activity"
            value={activity}
            status="normal"
          />
          <VitalItem
            icon={Sparkles}
            label="Glucose Trend"
            value={trend}
            status={trend === "stable" ? "normal" : "warning"}
          />
        </div>
      </div>

      {/* Expandable Reasons & Recommendations */}
      {healthScore < 90 && (
        <div className="mt-2.5 border-t border-border/20 pt-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-between text-[11px] font-semibold text-muted-foreground hover:text-foreground"
          >
            <span className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-primary-glow" />
              Factors & Suggestions
            </span>
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2 space-y-2 rounded-2xl bg-muted/30 p-2.5 text-xs max-h-[100px] overflow-y-auto">
                  {/* Reasons */}
                  <div>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">Reason</span>
                    <p className="mt-0.5 font-medium text-foreground text-[10px] leading-tight">{healthExplanation}</p>
                  </div>
                  
                  {/* Recommendations */}
                  <div>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">Recommendations</span>
                    <ul className="mt-0.5 list-disc pl-3 text-muted-foreground text-[9px] leading-snug space-y-0.5">
                      {healthRecommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

interface VitalItemProps {
  icon: React.ElementType;
  label: string;
  value: string;
  status: "normal" | "info" | "warning" | "critical";
}

function VitalItem({ icon: Icon, label, value, status }: VitalItemProps) {
  const statusColors = {
    normal: "text-foreground",
    info: "text-sky-400",
    warning: "text-amber-400",
    critical: "text-red-400"
  };

  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-border/20 bg-muted/10 p-2">
      <div className="flex items-center gap-1 text-[9px] text-muted-foreground leading-none">
        <Icon className="h-3 w-3 shrink-0 text-muted-foreground/80" />
        <span className="truncate">{label}</span>
      </div>
      <div className={`text-xs font-semibold capitalize leading-none mt-0.5 ${statusColors[status]}`}>
        {value}
      </div>
    </div>
  );
}
