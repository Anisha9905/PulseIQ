import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Info, X, AlertTriangle } from "lucide-react";
import { useGlucoseStore } from "@/store/glucoseStore";

const typeMeta = {
  info: { icon: Info, color: "text-primary", ring: "ring-primary/20" },
  warning: { icon: AlertTriangle, color: "text-warning", ring: "ring-warning/30" },
  critical: { icon: AlertCircle, color: "text-destructive", ring: "ring-destructive/30" },
};

export function AlertsStack() {
  const alerts = useGlucoseStore((s) => s.alerts);
  const dismiss = useGlucoseStore((s) => s.dismissAlert);

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-full max-w-sm flex-col gap-3">
      <AnimatePresence>
        {alerts.map((a) => {
          const meta = typeMeta[a.type];
          const Icon = meta.icon;
          return (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
                transition: a.type === "critical" ? { type: "spring", stiffness: 300, damping: 18 } : { duration: 0.35 },
              }}
              exit={{ opacity: 0, x: 60, scale: 0.95, transition: { duration: 0.25 } }}
              className={`pointer-events-auto glass flex items-start gap-3 rounded-2xl p-4 shadow-card ring-1 ${meta.ring}`}
            >
              <div className={`mt-0.5 ${meta.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{a.message}</p>
              </div>
              <button
                onClick={() => dismiss(a.id)}
                className="rounded-lg p-1 text-muted-foreground transition-smooth hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
