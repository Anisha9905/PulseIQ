import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, ChevronRight, Brain, Activity } from "lucide-react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useGlucoseStore } from "@/store/glucoseStore";

const PHASES = [
  { id: 0, label: "Fasting",       hint: "Morning before breakfast (8+ hrs fast)",  color: "from-blue-500/20 to-blue-600/10",   border: "border-blue-500/40",   text: "text-blue-600 dark:text-blue-400" },
  { id: 1, label: "Before Meal",   hint: "Just before eating (not fasted)",          color: "from-amber-500/20 to-amber-600/10", border: "border-amber-500/40",  text: "text-amber-600 dark:text-amber-400" },
  { id: 2, label: "After Meal",    hint: "30–60 min after eating",                   color: "from-orange-500/20 to-orange-600/10",border: "border-orange-500/40", text: "text-orange-600 dark:text-orange-400" },
  { id: 3, label: "Post Activity", hint: "Within 15 min after exercise",             color: "from-green-500/20 to-green-600/10", border: "border-green-500/40",  text: "text-green-600 dark:text-green-400" },
];

const DAYS = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"];

type GridValues = Record<string, string>; // key = "day-phase"

export default function Calibration() {
  const navigate     = useNavigate();
  const user         = useGlucoseStore((s) => s.user);
  const setConfidence = useGlucoseStore((s) => s.setConfidence);

  const [values, setValues]       = useState<GridValues>({});
  const [loading, setLoading]     = useState(false);
  const [trainStage, setTrainStage] = useState<"idle"|"saving"|"training"|"done">("idle");
  const [confidence, setLocalConfidence] = useState<number | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const setValue = (day: number, phase: number, val: string) => {
    setValues((prev) => ({ ...prev, [`${day}-${phase}`]: val }));
  };

  const totalCells = 7 * 4; // 28
  const filledCells = Object.values(values).filter((v) => v.trim() !== "" && Number(v) >= 40 && Number(v) <= 400).length;
  const progressPct = Math.round((filledCells / totalCells) * 100);
  const canSubmit = filledCells === totalCells;

  // Map user gender string → encoded int
  const genderCode = (g?: string) => ({ male: 0, female: 1, other: 2 }[g || "other"] ?? 2);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    const uid  = auth.currentUser?.uid || "demo_user";
    const age  = user?.age || 30;
    const gender = genderCode(user?.gender);

    // ── Step 1: Save all entries to Firebase ─────────────────────────────────
    setTrainStage("saving");
    const entries: any[] = [];
    for (let day = 1; day <= 7; day++) {
      for (let phase = 0; phase < 4; phase++) {
        const glucose = Number(values[`${day}-${phase}`]);
        entries.push({ day, phase, glucose, age, gender });
        try {
          await addDoc(collection(db, "historical_glucose_entries"), {
            user_id:      uid,
            glucose_value: glucose,
            state:         ["fasting","before_meal","after_meal","post_activity"][phase],
            day_number:    day,
            phase,
            recorded_at:   Timestamp.now(),
            created_at:    Timestamp.now(),
          });
        } catch (err) {
          console.error("Firebase write error:", err);
        }
      }
    }

    // ── Step 2: Call Python ML service to train XGBoost ──────────────────────
    setTrainStage("training");
    try {
      let res: Response;
      try {
        res = await fetch("http://localhost:5000/api/train", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ user_id: uid, entries }),
        });
      } catch {
        res = await fetch("http://127.0.0.1:8001/train", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ user_id: uid, entries }),
        });
      }

      if (!res.ok) throw new Error(`ML service returned ${res.status}`);
      const result = await res.json();

      const conf = result.confidence ?? 90;
      setLocalConfidence(conf);
      setConfidence(Math.round(conf));

      // Store model metadata in Firebase
      try {
        const { setDoc, doc } = await import("firebase/firestore");
        await setDoc(doc(db, "ml_models", uid), {
          model_id:        uid,
          user_id:         uid,
          model_version:   "xgb-v1",
          status:          "active",
          confidence_score: conf,
          accuracy_score:  result.rmse,
          n_samples:       result.n_samples,
          training_end:    Timestamp.now(),
          created_at:      Timestamp.now(),
        });
      } catch (e) {
        console.warn("Firebase doc write warning:", e);
      }

      setTrainStage("done");
      setTimeout(() => navigate("/dashboard"), 2500);
    } catch (err: any) {
      console.error("ML training error:", err);
      setError("Could not reach the ML service. Ensure backend/server.js and python ml_service.py are running.");
      setTrainStage("idle");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-aurora">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-primary-glow/20 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-primary-glow shadow-soft" />
          <span className="font-display text-lg font-semibold tracking-tight">PulseIQ</span>
        </div>
        {/* Progress badge */}
        <div className="flex items-center gap-3 rounded-full border border-border bg-card/60 px-4 py-2 backdrop-blur">
          <span className="text-xs text-muted-foreground">Calibration</span>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-xs font-semibold text-primary">{filledCells}/{totalCells}</span>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary">7-Day Calibration Required</span>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Train your personal AI model
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
            Enter your glucose readings for each phase over 7 days. PulseIQ uses this
            to train a personalized <strong>XGBoost model</strong> that predicts your glucose every 5 minutes.
          </p>
        </motion.div>

        {/* ── Training overlay ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {(trainStage === "saving" || trainStage === "training" || trainStage === "done") && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background/80 backdrop-blur-xl"
            >
              {trainStage === "done" ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="flex h-24 w-24 items-center justify-center rounded-full bg-success/20"
                  >
                    <Check className="h-12 w-12 text-success" />
                  </motion.div>
                  <h2 className="font-display text-2xl font-semibold">Model Trained!</h2>
                  <p className="text-sm text-muted-foreground">Confidence: <strong>{confidence?.toFixed(1)}%</strong></p>
                  <p className="text-xs text-muted-foreground">Launching your dashboard…</p>
                </>
              ) : (
                <>
                  <div className="relative flex h-24 w-24 items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary"
                    />
                    {trainStage === "saving" ? (
                      <Activity className="h-8 w-8 text-primary" />
                    ) : (
                      <Brain className="h-8 w-8 text-primary" />
                    )}
                  </div>
                  <h2 className="font-display text-xl font-semibold">
                    {trainStage === "saving" ? "Saving your readings…" : "Training XGBoost model…"}
                  </h2>
                  <p className="max-w-xs text-center text-sm text-muted-foreground">
                    {trainStage === "saving"
                      ? "Storing 28 glucose readings to Firebase."
                      : "Building your personalized glucose prediction model."}
                  </p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 7-day × 4-phase Grid ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="overflow-hidden rounded-3xl border border-border bg-card shadow-card"
        >
          {/* Phase headers */}
          <div className="grid grid-cols-5 gap-0 border-b border-border">
            <div className="p-4 text-xs font-medium text-muted-foreground">Day</div>
            {PHASES.map((ph) => (
              <div key={ph.id} className={`p-4 bg-gradient-to-b ${ph.color} border-l border-border`}>
                <p className={`text-xs font-semibold ${ph.text}`}>{ph.label}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground leading-tight">{ph.hint}</p>
              </div>
            ))}
          </div>

          {/* Day rows */}
          {DAYS.map((dayLabel, dayIdx) => {
            const day = dayIdx + 1;
            return (
              <div
                key={day}
                className={`grid grid-cols-5 gap-0 border-b border-border last:border-0 ${
                  dayIdx % 2 === 0 ? "bg-background/30" : ""
                }`}
              >
                {/* Day label */}
                <div className="flex items-center px-4 py-3">
                  <span className="text-sm font-medium text-muted-foreground">{dayLabel}</span>
                </div>

                {/* Phase cells */}
                {PHASES.map((ph) => {
                  const key  = `${day}-${ph.id}`;
                  const val  = values[key] ?? "";
                  const num  = Number(val);
                  const valid = val !== "" && num >= 40 && num <= 400;
                  const warn  = val !== "" && (num < 60 || num > 250);
                  return (
                    <div key={ph.id} className={`border-l border-border p-2`}>
                      <div className={`relative flex items-center rounded-xl border px-3 py-2 transition-smooth ${
                        valid && !warn ? "border-success/50 bg-success/5" :
                        warn          ? "border-warning/50 bg-warning/5" :
                        val !== ""    ? "border-destructive/50 bg-destructive/5" :
                        `${ph.border} bg-background/50`
                      }`}>
                        <input
                          type="number"
                          value={val}
                          onChange={(e) => setValue(day, ph.id, e.target.value)}
                          placeholder="mg/dL"
                          min={40}
                          max={400}
                          className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/40"
                        />
                        {valid && (
                          <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </motion.div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-success" /> Valid (40–400 mg/dL)</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-warning" /> Unusual (&lt;60 or &gt;250)</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Out of range</span>
        </div>

        {/* Error banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4"
          >
            <p className="whitespace-pre-line text-sm text-destructive">{error}</p>
            <button
              onClick={() => navigate("/dashboard")}
              className="mt-3 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Skip to dashboard <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}

        {/* Submit */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-6 flex flex-col items-center gap-3"
        >
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="group flex h-14 w-full max-w-sm items-center justify-center gap-3 rounded-2xl bg-primary text-primary-foreground shadow-soft transition-smooth hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Brain className="h-5 w-5" />
                <span className="font-semibold">Train My XGBoost Model</span>
                <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
          {!canSubmit && (
            <p className="text-xs text-muted-foreground">
              Fill all {totalCells} cells to enable training ({totalCells - filledCells} remaining)
            </p>
          )}
        </motion.div>
      </main>
    </div>
  );
}
