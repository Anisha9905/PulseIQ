import { motion } from "framer-motion";
import { useGlucoseStore } from "@/store/glucoseStore";
import { ThemeToggle } from "@/components/ThemeToggle";

export function DashboardHeader() {
  const connected = useGlucoseStore((s) => s.connected);
  const user = useGlucoseStore((s) => s.user);

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-primary-glow shadow-soft" />
          <span className="font-display text-base font-semibold tracking-tight">PulseIQ</span>
        </div>

        <div className="hidden items-center gap-2 rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur md:flex">
          <span className="relative flex h-2 w-2">
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`absolute inset-0 rounded-full ${connected ? "bg-success" : "bg-destructive"}`}
            />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${connected ? "bg-success" : "bg-destructive"}`} />
          </span>
          {connected ? "Sensor connected" : "Disconnected"}
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary-glow/30 text-sm font-semibold text-primary">
            {(user?.name?.[0] || "A").toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
