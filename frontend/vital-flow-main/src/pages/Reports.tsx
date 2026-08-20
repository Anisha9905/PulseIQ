import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Download, Loader2, User, Heart, Thermometer,
  Activity, Droplets, Brain, TrendingUp, TrendingDown,
  ShieldCheck, AlertTriangle, Zap, Clock, BarChart2,
  CheckCircle2, XCircle, Info, Eye, X, Printer
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
  ReferenceLine, CartesianGrid
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { useGlucoseStore } from "@/store/glucoseStore";
import { useRealtimeGlucose } from "@/hooks/useRealtimeGlucose";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { generatePDFReport } from "@/lib/reportGenerator";
import { CalibrationTrendChart } from "@/components/dashboard/CalibrationTrendChart";

const fadeUp = { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } };

export default function Reports() {
  useRealtimeGlucose();

  const history        = useGlucoseStore((s) => s.history);
  const user           = useGlucoseStore((s) => s.user);
  const currentGlucose = useGlucoseStore((s) => s.current);
  const confidence     = useGlucoseStore((s) => s.confidence);
  const calibration    = useGlucoseStore((s) => s.calibration);
  const alerts         = useGlucoseStore((s) => s.alerts);

  // chartData and stats come from useMemo so the graph always has data,
  // but isAnimationActive={false} on the chart stops it from re-animating.
  const last24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 3600_000;
    return history.filter((r) => r.time >= cutoff);
  }, [history]);

  const stats = useMemo(() => {
    const vals = last24h.map((r) => r.value);
    if (!vals.length) return { avg: 0, min: 0, max: 0, inRange: 0 };
    const avg     = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    const min     = Math.min(...vals);
    const max     = Math.max(...vals);
    const inRange = Math.round((vals.filter((v) => v >= 70 && v <= 140).length / vals.length) * 100);
    return { avg, min, max, inRange };
  }, [last24h]);

  // Freeze chart data once on mount so the graph never shifts/moves.
  // New WebSocket readings still get reflected in the stat cards above,
  // but the visual graph stays fixed like a printed report snapshot.
  const [chartData] = useState(() => {
    const cutoff = Date.now() - 24 * 3600_000;
    return useGlucoseStore.getState().history
      .filter((r) => r.time >= cutoff)
      .map((r) => ({
        label: new Date(r.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        value: r.value,
      }));
  });

  const trendVal = useMemo(() => {
    if (history.length < 2) return "Stable";
    const diff = history[history.length - 1].value - history[history.length - 2].value;
    return diff > 3 ? "Rising" : diff < -3 ? "Falling" : "Stable";
  }, [history]);

  // Snapshot only the fast-changing vitals once on mount so they don't
  // flicker every second. riskLevel is also snapshotted for stability.
  const [snapshot] = useState(() => {
    const s = useGlucoseStore.getState() as any;
    const g = s.current || 108;
    return {
      temperature   : s.temperature   || 36.6,
      stress        : s.stress        || "low",
      activity      : s.activity      || "resting",
      healthScore   : s.healthScore   || 94,
      healthCategory: s.healthCategory || "optimal",
      riskLevel     : g > 140 ? "High" : g < 70 ? "High" : g > 120 ? "Moderate" : "Low",
    };
  });

  const temperature    = snapshot.temperature;
  const stress         = snapshot.stress;
  const activity       = snapshot.activity;
  const healthScore    = snapshot.healthScore;
  const healthCategory = snapshot.healthCategory;
  const riskLevel      = snapshot.riskLevel;

  const spo2 = useGlucoseStore((s: any) => s.spo2) || 98;
  const healthExplanation     = useGlucoseStore((s: any) => s.healthExplanation)     || "Your metabolic rate is operating efficiently.";
  const healthRecommendations = useGlucoseStore((s: any) => s.healthRecommendations) || [
    "Drink more water throughout the day",
    "Engage in mild activity post meals",
    "Monitor levels after heavy workouts",
  ];

  const [fbEntries, setFbEntries] = useState<any[]>([]);
  const [fbLoading, setFbLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

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
        setFbEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Failed to fetch Firebase entries:", err);
      } finally {
        setFbLoading(false);
      }
    };
    fetchEntries();
  }, []);

  const heartRate = useGlucoseStore((s: any) => s.heartRate) || 72;
  const bmi = user && (user as any).weight && (user as any).height
    ? ((user as any).weight / Math.pow((user as any).height / 100, 2)).toFixed(1)
    : null;

  const reportId    = useMemo(() => `PIQ-${Math.floor(100000 + Math.random() * 900000)}`, []);
  const generatedAt = new Date().toLocaleString([], { dateStyle: "long", timeStyle: "short" });

  const handleDownloadPDF = () => {
    generatePDFReport({
      user, currentGlucose, trend: trendVal, healthScore, healthCategory,
      healthExplanation, healthRecommendations, heartRate, temperature,
      stress, spo2, activity, confidence, calibration, history, alerts,
      calibrationEntries: fbEntries,
    });
  };

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12 space-y-6">

        {/* Page Header */}
        <motion.div {...fadeUp} transition={{ duration: 0.45 }}
          className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Diagnostic Report</p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">Health Overview</h1>
            <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Generated {generatedAt}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {fbLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-2.5 text-sm font-semibold text-primary transition-smooth hover:bg-primary/10 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Eye className="h-4 w-4" />
              Preview Report
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-smooth hover:shadow-glow hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
          </div>
        </motion.div>

        {/* Patient Identity Card */}
        <motion.section {...fadeUp} transition={{ duration: 0.45, delay: 0.05 }}
          className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-center gap-6">
            <div className="relative shrink-0">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 ring-2 ring-primary/20 text-2xl font-bold text-primary">
                {user?.avatar
                  ? <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                  : (user?.name?.[0] || "P").toUpperCase()}
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-success text-white">
                <CheckCircle2 className="h-3 w-3" />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-bold tracking-tight">{user?.name || "Patient"}</h2>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">PulseIQ Patient</span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{user?.email || "—"}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                {user?.age       && <span className="text-muted-foreground">Age: <strong className="text-foreground">{user.age} yrs</strong></span>}
                {user?.gender    && <span className="text-muted-foreground capitalize">Gender: <strong className="text-foreground">{user.gender}</strong></span>}
                {(user as any)?.height && <span className="text-muted-foreground">Height: <strong className="text-foreground">{(user as any).height} cm</strong></span>}
                {(user as any)?.weight && <span className="text-muted-foreground">Weight: <strong className="text-foreground">{(user as any).weight} kg</strong></span>}
                {bmi             && <span className="text-muted-foreground">BMI: <strong className="text-foreground">{bmi}</strong></span>}
                {user?.phone     && <span className="text-muted-foreground">Phone: <strong className="text-foreground">{user.phone}</strong></span>}
              </div>
            </div>
            <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-4 shadow-soft text-center shrink-0">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">AI Health Score</p>
              <p className="mt-1 font-display text-4xl font-bold text-primary tnum">{healthScore}</p>
              <p className="mt-0.5 text-xs capitalize font-semibold text-success">{healthCategory}</p>
            </div>
          </div>
        </motion.section>

        {/* Stats Row */}
        <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.1 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Current Glucose" value={`${currentGlucose}`} unit="mg/dL" icon={<Droplets className="h-4 w-4" />}
            tone={currentGlucose > 140 ? "text-destructive" : currentGlucose < 70 ? "text-warning" : "text-success"} />
          <StatCard label="24h Average" value={`${stats.avg || "—"}`} unit="mg/dL" icon={<BarChart2 className="h-4 w-4" />} />
          <StatCard label="Range (min–max)" value={stats.min ? `${stats.min}–${stats.max}` : "—"} unit="mg/dL" icon={<Activity className="h-4 w-4" />} />
          <StatCard label="Time in Range" value={`${stats.inRange || "—"}`} unit="%" icon={<ShieldCheck className="h-4 w-4" />} tone="text-success" />
        </motion.div>

        {/* Trend Chart */}
        <motion.section {...fadeUp} transition={{ duration: 0.45, delay: 0.15 }}
          className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Glucose Trend — Last 24 Hours</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Real-time readings from your sensor</p>
            </div>
            <TrendBadge trend={trendVal} />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="rptGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={50} />
                <YAxis domain={[60, 200]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={34} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} formatter={(v: any) => [`${v} mg/dL`, "Glucose"]} />
                <ReferenceLine y={70}  stroke="hsl(var(--glucose-low))"  strokeDasharray="4 3" strokeOpacity={0.6} />
                <ReferenceLine y={140} stroke="hsl(var(--glucose-high))" strokeDasharray="4 3" strokeOpacity={0.6} />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#rptGrad)" isAnimationActive={false} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        {/* Vitals */}
        <motion.section {...fadeUp} transition={{ duration: 0.45, delay: 0.2 }}>
          <h2 className="mb-3 font-display text-lg font-semibold">Physiological Parameters</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <VitalCard icon={<Heart className="h-5 w-5 text-rose-500" />}       label="Heart Rate"   value="N/A"           unit=""   sub="Sensor not connected" />
            <VitalCard icon={<Droplets className="h-5 w-5 text-sky-500" />}     label="SpO₂"         value="N/A"           unit=""   sub="PPG not connected" />
            <VitalCard icon={<Thermometer className="h-5 w-5 text-orange-500" />} label="Skin Temp"  value={`${temperature}`} unit="°C" sub={temperature > 37.2 ? "Slightly elevated" : "Normal range"} />
            <VitalCard icon={<Brain className="h-5 w-5 text-purple-500" />}     label="Stress Level" value={stress}        unit=""   sub="From sensor data" />
            <VitalCard icon={<Zap className="h-5 w-5 text-amber-500" />}        label="Activity"     value={activity}      unit=""   sub="Current state" />
          </div>
        </motion.section>

        {/* Insights + Recommendations */}
        <div className="grid gap-6 lg:grid-cols-2">
          <motion.section {...fadeUp} transition={{ duration: 0.45, delay: 0.25 }}
            className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
            <h2 className="mb-1 font-display text-lg font-semibold">AI Health Insights</h2>
            <p className="mb-5 text-sm text-muted-foreground">{healthExplanation}</p>
            <div className="space-y-3">
              {[
                { icon: <Droplets className="h-4 w-4 text-primary" />,      text: `Current glucose: ${currentGlucose} mg/dL — trend is ${trendVal.toLowerCase()}.` },
                { icon: <Thermometer className="h-4 w-4 text-orange-500" />, text: `Skin temperature at ${temperature} °C — ${temperature > 37.2 ? "slightly elevated." : "within normal range."}` },
                { icon: <ShieldCheck className="h-4 w-4 text-success" />,    text: `${stats.inRange || 0}% of readings in the healthy range over last 24 hours.` },
                { icon: <Brain className="h-4 w-4 text-purple-500" />,      text: `Stress level is ${stress} — may influence glucose variability.` },
              ].map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.07 }}
                  className="flex gap-3 rounded-2xl bg-accent/30 p-3">
                  <span className="mt-0.5 shrink-0">{item.icon}</span>
                  <p className="text-sm leading-relaxed">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.section {...fadeUp} transition={{ duration: 0.45, delay: 0.28 }}
            className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
            <h2 className="mb-1 font-display text-lg font-semibold">Personalized Recommendations</h2>
            <p className="mb-5 text-sm text-muted-foreground">Based on your AI health assessment</p>
            <div className="space-y-3">
              {[
                { cat: "Diet",      tip: healthRecommendations[0] || "Maintain a balanced meal plan." },
                { cat: "Activity",  tip: healthRecommendations[1] || "Incorporate light movement post meals." },
                { cat: "Hydration", tip: healthRecommendations[2] || "Stay hydrated throughout the day." },
                { cat: "Sleep",     tip: "Prioritize consistent sleep to optimize metabolic function." },
                { cat: "Stress",    tip: "Engage in relaxation exercises to stabilize glucose." },
              ].map((rec, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                  </span>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary">{rec.cat}: </span>
                    <span className="text-sm text-foreground">{rec.tip}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        </div>

        {/* Risk + Calibration + Sensors */}
        <div className="grid gap-6 lg:grid-cols-3">
          <motion.section {...fadeUp} transition={{ duration: 0.45, delay: 0.3 }}
            className={`rounded-3xl border p-6 shadow-soft sm:p-8 ${riskLevel === "High" ? "border-destructive/30 bg-destructive/5" : riskLevel === "Moderate" ? "border-warning/30 bg-warning/5" : "border-success/30 bg-success/5"}`}>
            <div className="flex items-center gap-3 mb-4">
              {riskLevel === "Low" ? <ShieldCheck className="h-5 w-5 text-success" /> : <AlertTriangle className={`h-5 w-5 ${riskLevel === "High" ? "text-destructive" : "text-warning"}`} />}
              <h2 className="font-display text-lg font-semibold">Risk Assessment</h2>
            </div>
            <p className={`font-display text-3xl font-bold ${riskLevel === "High" ? "text-destructive" : riskLevel === "Moderate" ? "text-warning" : "text-success"}`}>{riskLevel} Risk</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {riskLevel === "High" ? "Glucose levels require attention. Please consult your healthcare provider." : riskLevel === "Moderate" ? "Levels are borderline. Monitor closely." : "No abnormal readings. Keep up the routine!"}
            </p>
          </motion.section>

          <motion.section {...fadeUp} transition={{ duration: 0.45, delay: 0.32 }}
            className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
            <h2 className="mb-4 font-display text-lg font-semibold">Model Calibration</h2>
            <div className="space-y-4">
              <ProgressBar label="Calibration Quality" value={calibration} color="bg-primary" />
              <ProgressBar label="AI Confidence" value={confidence} color="bg-success" />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{fbEntries.length} calibration entries · {fbEntries.length > 5 ? "Model personalized." : "Add more for accuracy."}</p>
          </motion.section>

          <motion.section {...fadeUp} transition={{ duration: 0.45, delay: 0.34 }}
            className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
            <h2 className="mb-4 font-display text-lg font-semibold">Sensor Status</h2>
            <div className="space-y-2.5">
              {[
                { name: "Heart Rate Sensor",       ok: false },
                { name: "SpO₂ Sensor (PPG)",       ok: false },
                { name: "Accelerometer (MPU6050)", ok: true  },
                { name: "GSR Sensor",              ok: false },
                { name: "PulseIQ Band",            ok: false },
              ].map((s) => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className={`flex items-center gap-1 text-xs font-semibold ${s.ok ? "text-success" : "text-destructive"}`}>
                    {s.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    {s.ok ? "Connected" : "Offline"}
                  </span>
                </div>
              ))}
            </div>
          </motion.section>
        </div>

        {/* 7-Day Calibration Trend Chart */}
        <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.33 }}>
          <CalibrationTrendChart />
        </motion.div>

        {/* Alerts */}
        <motion.section {...fadeUp} transition={{ duration: 0.45, delay: 0.36 }}
          className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
          <h2 className="mb-1 font-display text-lg font-semibold">Alerts &amp; Warnings</h2>
          <p className="mb-5 text-sm text-muted-foreground">Recent system-generated alerts</p>
          {alerts.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl bg-success/10 p-4">
              <ShieldCheck className="h-5 w-5 text-success shrink-0" />
              <p className="text-sm font-medium text-success">No alerts detected. All readings within acceptable ranges.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className={`flex items-start gap-3 rounded-2xl p-3.5 ${alert.type === "critical" ? "bg-destructive/10 border border-destructive/20" : "bg-warning/10 border border-warning/20"}`}>
                  <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${alert.type === "critical" ? "text-destructive" : "text-warning"}`} />
                  <div>
                    <p className="text-sm font-semibold">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        {/* Export Banner */}
        <motion.section {...fadeUp} transition={{ duration: 0.45, delay: 0.38 }}
          className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Diagnostic Summary PDF</p>
                <h3 className="mt-1 font-display text-xl font-bold">Download Full Report</h3>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  Export a comprehensive A4 PDF with all metrics, trend graphs, sensor data, AI insights, recommendations, and clinical summary.
                </p>
                <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" /> For health monitoring purposes only. Not a substitute for professional medical advice.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPreview(true)}
                className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-2.5 text-sm font-semibold text-primary transition-smooth hover:bg-primary/10">
                <Eye className="h-4 w-4" /> Preview
              </button>
              <button onClick={handleDownloadPDF}
                className="flex h-12 items-center gap-2.5 rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-soft transition-smooth hover:shadow-glow hover:scale-[1.02] active:scale-[0.99]">
                <Download className="h-4 w-4" /> Export PDF
              </button>
            </div>
          </div>
        </motion.section>
      </main>

      {/* ── PDF Preview Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showPreview && (
          <PDFPreviewModal
            user={user}
            currentGlucose={currentGlucose}
            trendVal={trendVal}
            stats={stats}
            history={history}
            healthScore={healthScore}
            healthCategory={healthCategory}
            healthExplanation={healthExplanation}
            healthRecommendations={healthRecommendations}
            temperature={temperature}
            stress={stress}
            activity={activity}
            confidence={confidence}
            calibration={calibration}
            alerts={alerts}
            fbEntries={fbEntries}
            riskLevel={riskLevel}
            bmi={bmi}
            reportId={reportId}
            generatedAt={generatedAt}
            onClose={() => setShowPreview(false)}
            onDownload={handleDownloadPDF}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}

// ── PDF Preview Modal ──────────────────────────────────────────────────────
const PHASE_NAMES_PREVIEW = ["Morning", "Afternoon", "Evening", "Night"];

function PDFPreviewModal({ user, currentGlucose, trendVal, stats, history,
  healthScore, healthCategory, healthExplanation, healthRecommendations,
  temperature, stress, activity, confidence, calibration, alerts,
  fbEntries, riskLevel, bmi, reportId, generatedAt, onClose, onDownload }: any) {

  // ── 24h chart: use real history filtered to last 24h ──────────────────────
  const chart24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 3600_000;
    return (history as { time: number; value: number }[])
      .filter((r) => r.time >= cutoff)
      .map((r) => ({
        label: new Date(r.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        value: r.value,
        time: r.time,
      }));
  }, [history]);

  // ── 7-day calibration chart: same logic as CalibrationTrendChart ──────────
  const calibChartData = useMemo(() => {
    const data: { label: string; day: number; phaseName: string; value: number | null }[] = [];
    for (let d = 1; d <= 7; d++) {
      for (let p = 0; p < 4; p++) {
        const match = (fbEntries as any[]).find(
          (e) => e.day_number === d && e.phase === p
        );
        data.push({
          label: `D${d} ${PHASE_NAMES_PREVIEW[p]}`,
          day: d,
          phaseName: PHASE_NAMES_PREVIEW[p],
          value: match ? match.glucose_value : null,
        });
      }
    }
    return data;
  }, [fbEntries]);

  const calibValues = calibChartData.map((d) => d.value).filter((v) => v !== null) as number[];
  const calibStats = {
    count: calibValues.length,
    avg: calibValues.length ? Math.round(calibValues.reduce((a, b) => a + b, 0) / calibValues.length) : 0,
    min: calibValues.length ? Math.min(...calibValues) : 0,
    max: calibValues.length ? Math.max(...calibValues) : 0,
    completion: Math.round((calibValues.length / 28) * 100),
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel — slides in from right, covers dashboard width */}
      <motion.div
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="fixed inset-y-0 right-0 z-50 flex flex-col bg-[#f5f7fa] shadow-2xl"
        style={{ width: "min(860px, 100vw)" }}
      >
        {/* Modal Toolbar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-bold text-slate-800">PulseIQ Diagnostic Report</p>
              <p className="text-xs text-slate-500">Report ID: {reportId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onDownload}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors">
              <Download className="h-3.5 w-3.5" /> Download PDF
            </button>
            <button onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable A4-style content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-[780px] bg-white shadow-lg rounded-lg overflow-hidden" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>

            {/* PDF Header */}
            <div className="bg-[#1976d2] px-8 py-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xl font-bold tracking-tight">PulseIQ</p>
                  <p className="mt-0.5 text-sm text-blue-200">AI-Based Non-Invasive Glucose Trend Prediction System</p>
                  <p className="text-xs text-blue-300">Health Assessment Report</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold">Report ID: {reportId}</p>
                  <p className="mt-0.5 text-xs text-blue-200">{generatedAt}</p>
                  <span className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-bold ${riskLevel === "High" ? "bg-red-500" : riskLevel === "Moderate" ? "bg-orange-400" : "bg-green-500"}`}>
                    {riskLevel} Risk
                  </span>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-7">

              {/* 1. Patient Information */}
              <PDFSection title="1. Patient Information">
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  {[
                    ["Patient Name",  user?.name    || "Not Available"],
                    ["Patient ID",    user?.email   || "Not Available"],
                    ["Age",           user?.age     ? `${user.age} years`       : "Not Available"],
                    ["Gender",        user?.gender  ? user.gender                : "Not Available"],
                    ["Height",        (user as any)?.height ? `${(user as any).height} cm` : "Not Available"],
                    ["Weight",        (user as any)?.weight ? `${(user as any).weight} kg` : "Not Available"],
                    ["BMI",           bmi            || "Not Available"],
                    ["Contact",       user?.phone   || "Not Available"],
                  ].map(([label, val]) => (
                    <div key={label} className="flex gap-2">
                      <span className="w-32 shrink-0 text-slate-500">{label}:</span>
                      <span className="font-semibold text-slate-800">{val}</span>
                    </div>
                  ))}
                </div>
              </PDFSection>

              {/* 2. Executive Summary */}
              <PDFSection title="2. Executive Summary">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Predicted Glucose", val: `${currentGlucose} mg/dL`, color: "#1976d2" },
                    { label: "AI Health Score",   val: `${healthScore} / 100`,    color: "#0288d1" },
                    { label: "Heart Rate",        val: "Not Available",            color: "#607D8B" },
                    { label: "Oxygen (SpO₂)",     val: "Not Available",            color: "#607D8B" },
                    { label: "Skin Temperature",  val: `${temperature} °C`,        color: "#333"    },
                    { label: "Stress Level",      val: stress,                     color: "#333"    },
                    { label: "Activity Level",    val: activity,                   color: "#333"    },
                    { label: "Overall Status",    val: healthCategory,             color: "#2e7d32" },
                    { label: "Risk Level",        val: riskLevel,                  color: riskLevel === "High" ? "#c62828" : riskLevel === "Moderate" ? "#ef6c00" : "#2e7d32" },
                  ].map((c) => (
                    <div key={c.label} className="rounded border border-slate-200 p-3" style={{ borderLeft: `3px solid ${c.color}` }}>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">{c.label}</p>
                      <p className="mt-0.5 text-sm font-bold capitalize" style={{ color: c.color }}>{c.val}</p>
                    </div>
                  ))}
                </div>
              </PDFSection>

              {/* 3. Glucose Trend Chart — real history from ML model */}
              <PDFSection title="3. Glucose Trend (Last 24 Hours)">
                <div className="mb-2 flex items-center gap-2">
                  <TrendBadge trend={trendVal} />
                  <span className="text-xs text-slate-500">{chart24h.length} readings from ML model</span>
                </div>
                <div className="h-56 w-full rounded border border-slate-100 bg-slate-50 p-2">
                  {chart24h.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chart24h} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                        <defs>
                          <linearGradient id="prevGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor="#1976d2" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#1976d2" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={50} />
                        <YAxis domain={[60, 200]} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip
                          contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11 }}
                          formatter={(v: any) => [`${v} mg/dL`, "Glucose"]}
                        />
                        <ReferenceLine y={70}  stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.7} label={{ value: "Low (70)",  position: "insideTopRight", fontSize: 8, fill: "#f59e0b" }} />
                        <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.7} label={{ value: "High (140)", position: "insideTopRight", fontSize: 8, fill: "#ef4444" }} />
                        <Area type="monotone" dataKey="value" stroke="#1976d2" strokeWidth={2} fill="url(#prevGrad)" dot={false} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1 text-xs text-slate-400">
                      <span>No readings in the last 24 hours yet.</span>
                      <span className="text-[10px]">Data appears as the ML model pushes readings via WebSocket.</span>
                    </div>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-[10px] text-slate-500">
                  <span>● <span className="text-blue-600">Blue line</span> = ML model predicted glucose</span>
                  <span>— <span className="text-yellow-500">Yellow dashed</span> = Low threshold (70 mg/dL)</span>
                  <span>— <span className="text-red-500">Red dashed</span> = High threshold (140 mg/dL)</span>
                </div>
              </PDFSection>

              {/* 4. Physiological Parameters */}
              <PDFSection title="4. Physiological Parameters">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#1976d2] text-white">
                      <th className="px-3 py-2 text-left text-xs font-semibold">Parameter</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Value</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Normal Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { p: "Heart Rate",        v: "N/A",               s: "Not Available", r: "60–100 bpm",    even: true  },
                      { p: "Oxygen (SpO₂)",     v: "N/A",               s: "Not Available", r: "95–100%",       even: false },
                      { p: "Skin Temperature",  v: `${temperature} °C`, s: temperature > 37.2 ? "Elevated" : "Normal", r: "36.1–37.2 °C", even: true },
                      { p: "Stress Level",      v: stress,              s: "—",             r: "Low / Moderate", even: false },
                      { p: "Activity Level",    v: activity,            s: "—",             r: "—",             even: true  },
                    ].map((row) => (
                      <tr key={row.p} className={row.even ? "bg-white" : "bg-slate-50"}>
                        <td className="px-3 py-2 text-slate-700">{row.p}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800 capitalize">{row.v}</td>
                        <td className={`px-3 py-2 text-xs font-semibold capitalize ${row.s === "Not Available" ? "text-slate-400" : row.s === "Elevated" ? "text-red-600" : "text-green-700"}`}>{row.s}</td>
                        <td className="px-3 py-2 text-xs text-slate-500">{row.r}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </PDFSection>

              {/* 5. Glucose Statistics */}
              <PDFSection title="5. Glucose Analysis">
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  {[
                    ["Current Predicted",   `${currentGlucose} mg/dL`],
                    ["24h Average",         stats.avg ? `${stats.avg} mg/dL` : "Not Available"],
                    ["Highest Recorded",    stats.max ? `${stats.max} mg/dL` : "Not Available"],
                    ["Lowest Recorded",     stats.min ? `${stats.min} mg/dL` : "Not Available"],
                    ["Time in Range",       stats.inRange ? `${stats.inRange}%` : "Not Available"],
                    ["Predicted Trend",     trendVal],
                  ].map(([label, val]) => (
                    <div key={label} className="flex gap-2">
                      <span className="w-40 shrink-0 text-slate-500">{label}:</span>
                      <span className="font-semibold text-slate-800">{val}</span>
                    </div>
                  ))}
                </div>
              </PDFSection>

              {/* 6. AI Insights */}
              <PDFSection title="6. AI Health Insights">
                <p className="mb-3 text-sm text-slate-600 italic">{healthExplanation}</p>
                <ul className="space-y-2 text-sm text-slate-700">
                  {[
                    `Heart rate and oxygen saturation sensors are currently not connected; cardiovascular metrics unavailable.`,
                    `Skin temperature recorded at ${temperature} °C — ${temperature > 37.2 ? "slightly elevated, monitor closely." : "within normal range."}`,
                    `Glucose prediction shows a ${trendVal.toLowerCase()} trend at ${currentGlucose} mg/dL.`,
                    `${stats.inRange || 0}% of 24h readings were within the healthy glucose range (70–140 mg/dL).`,
                  ].map((ins, i) => <li key={i} className="flex gap-2"><span className="text-blue-600 font-bold">•</span>{ins}</li>)}
                </ul>
              </PDFSection>

              {/* 7. Recommendations */}
              <PDFSection title="7. Personalized Recommendations">
                <div className="space-y-2">
                  {[
                    { cat: "Diet",            tip: healthRecommendations[0] || "Maintain a balanced meal plan and monitor post-meal glucose response." },
                    { cat: "Physical Activity",tip: healthRecommendations[1] || "Incorporate light movement during the day." },
                    { cat: "Hydration",        tip: healthRecommendations[2] || "Stay hydrated and keep fluid intake regular." },
                    { cat: "Sleep",            tip: "Prioritize consistent sleep patterns to optimize metabolic function." },
                    { cat: "Stress Management",tip: "Maintain a calm routine and engage in relaxation exercises." },
                    { cat: "Lifestyle",        tip: "Avoid late-night exertion to stabilize morning glucose levels." },
                  ].map((r) => (
                    <div key={r.cat} className="flex gap-2 text-sm">
                      <span className="w-36 shrink-0 font-bold text-slate-700">{r.cat}:</span>
                      <span className="text-slate-600">{r.tip}</span>
                    </div>
                  ))}
                </div>
              </PDFSection>

              {/* 8. Calibration — 7-day chart using real Firebase entries */}
              <PDFSection title="8. 7-Day Calibration Trend">
                {/* Stats row */}
                <div className="mb-3 grid grid-cols-4 gap-2">
                  {[
                    { label: "Readings",   val: `${calibStats.count}/28` },
                    { label: "Completion", val: `${calibStats.completion}%` },
                    { label: "Average",    val: calibStats.avg ? `${calibStats.avg} mg/dL` : "—" },
                    { label: "Status",     val: calibStats.count === 28 ? "Complete" : "Pending" },
                  ].map((s) => (
                    <div key={s.label} className="rounded border border-slate-200 bg-slate-50 p-2 text-center">
                      <p className="text-[10px] text-slate-500">{s.label}</p>
                      <p className="text-sm font-bold text-slate-800">{s.val}</p>
                    </div>
                  ))}
                </div>

                {/* Chart */}
                <div className="h-52 w-full rounded border border-slate-100 bg-slate-50 p-2">
                  {calibStats.count > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={calibChartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                        <defs>
                          <linearGradient id="calibLineGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%"   stopColor="#1976d2" />
                            <stop offset="100%" stopColor="#0288d1" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 8, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={30} />
                        <YAxis domain={[40, 200]} tick={{ fontSize: 8, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={28} />
                        <Tooltip
                          contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11 }}
                          formatter={(v: any, _: any, props: any) => [
                            v !== null ? `${v} mg/dL` : "No data",
                            `Day ${props.payload.day} – ${props.payload.phaseName}`,
                          ]}
                        />
                        <ReferenceLine y={70}  stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.6} />
                        <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.6} />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="url(#calibLineGrad)"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: "#fff", stroke: "#1976d2", strokeWidth: 2 }}
                          activeDot={{ r: 5, fill: "#1976d2" }}
                          connectNulls={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1 text-xs text-slate-400">
                      <span>No calibration entries yet.</span>
                      <span className="text-[10px]">Add glucose readings via "Add Details" to populate this chart.</span>
                    </div>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-[10px] text-slate-500">
                  <span>Each point = one manual glucose entry (day × phase slot)</span>
                  <span>28 slots total: 7 days × 4 phases (Morning / Afternoon / Evening / Night)</span>
                </div>

                {/* Progress bars */}
                <div className="mt-4 space-y-2">
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Calibration Quality</span><span>{calibration}%</span></div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden"><div className="h-full rounded-full bg-blue-600" style={{ width: `${calibration}%` }} /></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1"><span>AI Confidence</span><span>{confidence}%</span></div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden"><div className="h-full rounded-full bg-green-600" style={{ width: `${confidence}%` }} /></div>
                  </div>
                </div>
              </PDFSection>

              {/* 9. Sensor Status */}
              <PDFSection title="9. Sensor Status">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#1976d2] text-white">
                      <th className="px-3 py-2 text-left text-xs font-semibold">Sensor</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "Heart Rate Sensor",         ok: false },
                      { name: "SpO₂ Sensor (PPG)",         ok: false },
                      { name: "MPU6050 (Accelerometer)",   ok: true  },
                      { name: "GSR Sensor",                ok: false },
                      { name: "PulseIQ Band",              ok: false },
                    ].map((s, i) => (
                      <tr key={s.name} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="px-3 py-2 text-slate-700">{s.name}</td>
                        <td className={`px-3 py-2 text-xs font-bold ${s.ok ? "text-green-700" : "text-red-600"}`}>{s.ok ? "● Connected" : "● Disconnected"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </PDFSection>

              {/* 10. Alerts */}
              <PDFSection title="10. Alerts &amp; Warnings">
                {alerts.length === 0 ? (
                  <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    ✔ No abnormal physiological readings requiring immediate attention were detected.
                  </div>
                ) : alerts.map((a: any) => (
                  <div key={a.id} className={`mb-2 rounded border p-3 text-sm ${a.type === "critical" ? "border-red-200 bg-red-50 text-red-800" : "border-orange-200 bg-orange-50 text-orange-800"}`}>
                    <strong>{a.title}:</strong> {a.message}
                  </div>
                ))}
              </PDFSection>

              {/* 11. Disclaimer */}
              <div className="rounded border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 italic">
                <strong className="not-italic text-slate-700">Disclaimer:</strong> This report has been automatically generated by the PulseIQ AI-Based Non-Invasive Glucose Trend Prediction System using physiological sensor data and machine learning algorithms. It is intended for health monitoring, research, and educational purposes only. This report is not a substitute for professional medical diagnosis, treatment, or clinical decision-making. Users should consult qualified healthcare professionals before making any medical decisions.
              </div>

            </div>

            {/* PDF Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 px-8 py-4 text-xs text-slate-400">
              <span>Report ID: {reportId} · Generated {generatedAt}</span>
              <span>PulseIQ Health Monitoring System</span>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Helper sub-components ──────────────────────────────────────────────────

function PDFSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <div className="h-px flex-1 bg-slate-200" />
        <h3 className="shrink-0 rounded bg-slate-100 px-3 py-0.5 text-[11px] font-bold uppercase tracking-widest text-[#1976d2]">{title}</h3>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, unit, icon, tone }: { label: string; value: string; unit: string; icon: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">{icon} {label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`font-display tnum text-2xl font-bold ${tone || ""}`}>{value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function VitalCard({ icon, label, value, unit, sub }: { icon: React.ReactNode; label: string; value: string; unit: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft text-center">
      <div className="mb-2 flex justify-center">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-bold tnum capitalize">{value}{unit && <span className="text-xs font-normal ml-0.5">{unit}</span>}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground capitalize">{sub}</p>
    </div>
  );
}

function TrendBadge({ trend }: { trend: string }) {
  const cfg = {
    Rising:  { icon: <TrendingUp  className="h-3.5 w-3.5" />, cls: "bg-destructive/10 text-destructive" },
    Falling: { icon: <TrendingDown className="h-3.5 w-3.5" />, cls: "bg-warning/10 text-warning" },
    Stable:  { icon: <Activity    className="h-3.5 w-3.5" />, cls: "bg-success/10 text-success" },
  }[trend] ?? { icon: <Activity className="h-3.5 w-3.5" />, cls: "bg-success/10 text-success" };
  return (
    <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.cls}`}>
      {cfg.icon} {trend}
    </span>
  );
}

function ProgressBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-semibold">{value}%</span></div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className={`h-full rounded-full ${color}`} />
      </div>
    </div>
  );
}
