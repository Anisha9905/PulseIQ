import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { HeroOrb } from "@/components/dashboard/HeroOrb";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { RiskCard } from "@/components/dashboard/RiskCard";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";
import { CalibrationCard } from "@/components/dashboard/CalibrationCard";
import { AlertsStack } from "@/components/dashboard/AlertsStack";
import { useRealtimeGlucose } from "@/hooks/useRealtimeGlucose";
import { useLivePredictions } from "@/hooks/useLivePredictions";
import { useGlucoseStore } from "@/store/glucoseStore";
import { ProfileAvatar3D } from "@/components/ProfileAvatar3D";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

export default function Dashboard() {
  useRealtimeGlucose();     // WebSocket stream from Node backend
  useLivePredictions();     // Firestore onSnapshot stream — live predictions
  const user = useGlucoseStore((s) => s.user);
  const confidence = useGlucoseStore((s) => s.confidence);

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-6 py-8 lg:py-12">
        {/* Greeting + avatar */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5 }}
          className="mb-6 flex items-center gap-4"
        >
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-primary/20 to-primary-glow/30">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              <ProfileAvatar3D gender={user?.gender} age={user?.age} className="h-full w-full" />
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Good to see you</p>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {user?.name || "Welcome"}
            </h1>
          </div>
        </motion.div>

        <motion.section {...fadeUp} transition={{ duration: 0.5, delay: 0.05 }} className="mb-8">
          <HeroOrb />
        </motion.section>

        <div className="grid gap-6 lg:grid-cols-3">
          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }} className="lg:col-span-2">
            <TrendChart />
          </motion.div>

          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.15 }} className="space-y-6">
            <RiskCard />
            <CalibrationCard />
          </motion.div>
        </div>

        {/* System learning status */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-card to-primary-glow/5 p-6 shadow-soft sm:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-primary">PulseIQ intelligence</p>
                <h3 className="mt-0.5 font-display text-lg font-semibold">Learning your patterns…</h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Predictions sharpen with every reading you log. Add details to accelerate calibration.
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Confidence</p>
              <div className="text-display tnum text-3xl font-semibold">{confidence}%</div>
              <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${confidence}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow"
                />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.25 }} className="mt-6">
          <InsightsPanel />
        </motion.div>

        <p className="mt-12 text-center text-xs text-muted-foreground">
          PulseIQ Glucose Monitor · For demonstration purposes
        </p>
      </main>

      <AlertsStack />
    </AppShell>
  );
}
