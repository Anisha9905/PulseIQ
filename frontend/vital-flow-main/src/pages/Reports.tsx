import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useGlucoseStore } from "@/store/glucoseStore";
import { useRealtimeGlucose } from "@/hooks/useRealtimeGlucose";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { generatePDFReport } from "@/lib/reportGenerator";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

export default function Reports() {
  useRealtimeGlucose();
  const history = useGlucoseStore((s) => s.history);
  const user = useGlucoseStore((s) => s.user);
  const currentGlucose = useGlucoseStore((s) => s.current);
  
  // Dynamic vitals & AI states from store
  const heartRate = useGlucoseStore((s: any) => s.heartRate) || 72;
  const temperature = useGlucoseStore((s: any) => s.temperature) || 36.6;
  const stress = useGlucoseStore((s: any) => s.stress) || "low";
  const spo2 = useGlucoseStore((s: any) => s.spo2) || 98;
  const activity = useGlucoseStore((s: any) => s.activity) || "resting";
  const healthScore = useGlucoseStore((s: any) => s.healthScore) || 94;
  const healthCategory = useGlucoseStore((s: any) => s.healthCategory) || "optimal";
  const healthExplanation = useGlucoseStore((s: any) => s.healthExplanation) || "Your metabolic rate is operating efficiently.";
  const healthRecommendations = useGlucoseStore((s: any) => s.healthRecommendations) || [
    "Drink more water throughout the day",
    "Engage in mild activity post meals",
    "Monitor levels after heavy workouts"
  ];
  const confidence = useGlucoseStore((s) => s.confidence);
  const calibration = useGlucoseStore((s) => s.calibration);
  const alerts = useGlucoseStore((s) => s.alerts);

  const [fbEntries, setFbEntries] = useState<any[]>([]);
  const [fbLoading, setFbLoading] = useState(true);

  useEffect(() => {
    const fetchEntries = async () => {
      setFbLoading(true);
      try {
        const uid = auth.currentUser?.uid || "demo_user";
        const q = query(
          collection(db, "historical_glucose_entries"),
          where("user_id", "==", uid),
          orderBy("recorded_at", "asc")
        );
        const snap = await getDocs(q);
        const docs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setFbEntries(docs);
      } catch (err) {
        console.error("Failed to fetch Firebase entries:", err);
      } finally {
        setFbLoading(false);
      }
    };
    fetchEntries();
  }, []);

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-6 py-8 lg:py-12">
        <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-primary">Reports</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Diagnostic Reports</h1>
          </div>
          {fbLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mb-8 overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-primary-glow/5 p-6 shadow-soft sm:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-primary">Diagnostic Summary PDF</p>
                <h3 className="mt-1 font-display text-xl font-bold">Generate Health Monitoring Report</h3>
                <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
                  Download a comprehensive, diagnostic-grade A4 PDF report mapping your metabolic metrics, 
                  glucose trend logs, vital signals correlation, and personalized AI health suggestions.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const trendVal = history.length >= 2 
                  ? (history[history.length - 1].value - history[history.length - 2].value > 3 ? "Rising" : history[history.length - 1].value - history[history.length - 2].value < -3 ? "Falling" : "Stable") 
                  : "Stable";

                generatePDFReport({
                  user,
                  currentGlucose,
                  trend: trendVal,
                  healthScore,
                  healthCategory,
                  healthExplanation,
                  healthRecommendations,
                  heartRate,
                  temperature,
                  stress,
                  spo2,
                  activity,
                  confidence,
                  calibration,
                  history,
                  alerts,
                  calibrationEntries: fbEntries,
                });
              }}
              className="group flex h-12 items-center justify-center gap-2.5 rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-soft transition-smooth hover:shadow-glow hover:scale-[1.01] active:scale-[0.99]"
            >
              <Download className="h-4 w-4" />
              <span>Download PDF Report</span>
            </button>
          </div>
        </motion.div>
      </main>
    </AppShell>
  );
}
