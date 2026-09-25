import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Droplet, Check, ArrowRight, Coffee, Utensils, Moon, Activity, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { collection, addDoc, doc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useGlucoseStore, type EntryState } from "@/store/glucoseStore";
import { useRealtimeGlucose } from "@/hooks/useRealtimeGlucose";
import { MagneticButton } from "@/components/MagneticButton";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

const stateOptions: { id: EntryState; label: string; icon: React.ElementType; hint: string }[] = [
  { id: "fasting", label: "Fasting", icon: Moon, hint: "Before breakfast — no food for 8+ hours." },
  { id: "before_food", label: "Before food", icon: Coffee, hint: "Right before a meal, while still hungry." },
  { id: "after_food", label: "After food", icon: Utensils, hint: "Enter value 30–60 minutes after eating." },
  { id: "post_activity", label: "Post activity", icon: Activity, hint: "Within 15 minutes after exercise." },
];

export default function AddDetails() {
  useRealtimeGlucose();
  const navigate = useNavigate();
  const entries = useGlucoseStore((s) => s.entries);
  const addEntry = useGlucoseStore((s) => s.addEntry);
  const removeEntry = useGlucoseStore((s) => s.removeEntry);
  const calibration = useGlucoseStore((s) => s.calibration);
  const user = useGlucoseStore((s) => s.user);

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [time, setTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
  const [state, setState] = useState<EntryState>("before_food");
  const [value, setValue] = useState<string>("");
  const [success, setSuccess] = useState(false);

  const numeric = Number(value);
  const valid = numeric >= 40 && numeric <= 400;
  const warn = value && (numeric < 60 || numeric > 250);

  const submit = async () => {
    if (!valid) return;
    const [hh, mm] = time.split(":").map(Number);
    const d = new Date();
    d.setHours(hh, mm, 0, 0);

    // Always write to local state first (instant UI update)
    addEntry({ time: d.getTime(), state, value: numeric });

    // Then persist to Firestore asynchronously
    const uid = auth.currentUser?.uid || user?.email || "demo_user";
    try {
      // addDoc auto-generates a unique Firestore document ID
      await addDoc(collection(db, "historical_glucose_entries"), {
        user_id: uid,
        recorded_at: Timestamp.fromDate(d),
        glucose_value: numeric,
        state: state,
        created_at: Timestamp.now(),
      });
      console.log("Firebase: Glucose entry saved to 'historical_glucose_entries'");

      // Update calibration progress doc
      await setDoc(doc(db, "calibration_progress", uid), {
        user_id: uid,
        completed_entries: calibration + 4,
        progress_percent: Math.min(100, calibration + 4),
        status: calibration + 4 >= 100 ? "completed" : "in_progress",
        updated_at: Timestamp.now(),
      }, { merge: true }); // merge: true won't overwrite other fields
    } catch (err) {
      console.error("Firebase write failed:", err);
    }

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setStep(0);
      setValue("");
    }, 1400);
  };

  const dayOfCalibration = Math.min(7, Math.max(1, Math.ceil(calibration / 14)));

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-6 py-8 lg:py-12">
        <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-primary">Guided entry</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Help PulseIQ learn you.
            </h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              A few logged readings each day dramatically improve prediction accuracy.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <p className="text-xs text-muted-foreground">Calibration</p>
            <p className="mt-1 text-display text-xl font-semibold">Day {dayOfCalibration} of 7</p>
            <div className="mt-2 h-1.5 w-44 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${calibration}%` }}
                transition={{ duration: 0.7 }}
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow"
              />
            </div>
          </div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Stepper */}
          <motion.section
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8"
          >
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18 }}
                    className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15"
                  >
                    <Check className="h-8 w-8 text-success" />
                  </motion.div>
                  <h2 className="text-display text-2xl font-semibold">Entry saved</h2>
                  <p className="mt-2 text-sm text-muted-foreground">PulseIQ is updating your model.</p>
                </motion.div>
              ) : (
                <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="mb-6 flex items-center gap-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-smooth ${i <= step ? "bg-primary" : "bg-border"}`} />
                    ))}
                  </div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">
                    Step {step + 1} of 3
                  </p>

                  {step === 0 && (
                    <>
                      <h2 className="text-display mb-2 text-2xl font-semibold">When did you take this reading?</h2>
                      <p className="mb-6 text-sm text-muted-foreground">
                        Tap the time field to adjust. Defaults to now.
                      </p>
                      <div className="flex items-center gap-4 rounded-2xl border border-border bg-background/60 p-4">
                        <Clock className="h-5 w-5 text-primary" />
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="flex-1 bg-transparent text-display text-2xl font-semibold tracking-tight outline-none"
                        />
                      </div>
                    </>
                  )}

                  {step === 1 && (
                    <>
                      <h2 className="text-display mb-2 text-2xl font-semibold">What was the context?</h2>
                      <p className="mb-6 text-sm text-muted-foreground">
                        {stateOptions.find((s) => s.id === state)?.hint}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {stateOptions.map((opt, i) => (
                          <motion.button
                            key={opt.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            type="button"
                            onClick={() => setState(opt.id)}
                            className={`group flex items-center gap-3 rounded-2xl border p-4 text-left transition-smooth hover:scale-[1.01] ${
                              state === opt.id
                                ? "border-primary bg-primary/10"
                                : "border-border bg-background/40 hover:border-primary/40"
                            }`}
                          >
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${state === opt.id ? "bg-primary text-primary-foreground" : "bg-accent text-primary"}`}>
                              <opt.icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{opt.label}</p>
                              <p className="text-[11px] text-muted-foreground">{opt.hint}</p>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <h2 className="text-display mb-2 text-2xl font-semibold">What's the reading?</h2>
                      <p className="mb-6 text-sm text-muted-foreground">
                        Enter the glucose value shown on your meter (40–400 mg/dL).
                      </p>
                      <div className="flex items-end gap-4 rounded-2xl border border-border bg-background/60 p-6">
                        <Droplet className="mb-2 h-5 w-5 text-primary" />
                        <input
                          type="number"
                          autoFocus
                          value={value}
                          onChange={(e) => setValue(e.target.value)}
                          placeholder="120"
                          className="w-full flex-1 bg-transparent text-display text-5xl font-semibold tracking-tighter outline-none placeholder:text-muted-foreground/30"
                        />
                        <span className="mb-2 text-sm text-muted-foreground">mg/dL</span>
                      </div>
                      {value && !valid && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 text-xs text-destructive"
                        >
                          Please enter a value between 40 and 400 mg/dL.
                        </motion.p>
                      )}
                      {warn && valid && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 text-xs text-warning"
                        >
                          That reading is outside your typical range — double-check the value.
                        </motion.p>
                      )}
                    </>
                  )}

                  <div className="mt-8 flex items-center gap-3">
                    {step > 0 && (
                      <button
                        onClick={() => setStep((s) => (s - 1) as 0 | 1 | 2)}
                        className="h-12 rounded-2xl border border-border px-5 text-sm font-medium text-muted-foreground transition-smooth hover:bg-accent"
                      >
                        Back
                      </button>
                    )}
                    <MagneticButton
                      type="button"
                      disabled={step === 2 && !valid}
                      onClick={() => (step === 2 ? submit() : setStep((s) => (s + 1) as 0 | 1 | 2))}
                      className="group flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground shadow-soft transition-smooth hover:shadow-glow hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
                    >
                      <span className="text-sm font-medium">{step === 2 ? "Save entry" : "Continue"}</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </MagneticButton>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>

          {/* Timeline */}
          <motion.aside
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="rounded-3xl border border-border bg-card p-6 shadow-soft"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-semibold">Recent entries</h3>
              <button
                onClick={() => navigate("/history")}
                className="text-xs font-medium text-primary hover:underline"
              >
                View all
              </button>
            </div>
            {entries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center">
                <p className="text-xs text-muted-foreground">No entries yet. Add your first reading.</p>
              </div>
            ) : (
              <div className="relative space-y-3 pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-px before:bg-border">
                {entries.slice(0, 8).map((e, i) => (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="relative"
                  >
                    <span className="absolute -left-[14px] top-2 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                    <div className="group flex items-start justify-between gap-3 rounded-2xl bg-accent/30 p-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          {new Date(e.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {entryLabel(e.state)}
                        </p>
                        <p className="text-display tnum text-lg font-semibold">{e.value} <span className="text-xs text-muted-foreground">mg/dL</span></p>
                      </div>
                      <button
                        onClick={() => removeEntry(e.id)}
                        className="opacity-0 transition-smooth hover:text-destructive group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.aside>
        </div>
      </main>
    </AppShell>
  );
}

function entryLabel(s: EntryState) {
  const map: Record<EntryState, string> = {
    before_food: "Before food",
    after_food: "After food",
    fasting: "Fasting",
    post_activity: "Post activity",
  };
  return map[s];
}
