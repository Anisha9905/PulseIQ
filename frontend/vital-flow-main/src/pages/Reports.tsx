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
import { generatePDFReport, generatePDFDataURI } from "@/lib/reportGenerator";
import { CalibrationTrendChart } from "@/components/dashboard/CalibrationTrendChart";
import { SpotlightCard } from "@/components/SpotlightCard";

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

  const sensorMode      = useGlucoseStore((s: any) => s.sensorMode);
  const esp32Data       = useGlucoseStore((s: any) => s.esp32Data);
  const esp32Status     = useGlucoseStore((s: any) => s.esp32Status);
  const liveHeartRate   = useGlucoseStore((s: any) => s.heartRate) || 0;
  const liveTemperature = useGlucoseStore((s: any) => s.temperature) || 36.6;
  const liveGsr         = useGlucoseStore((s: any) => s.gsr) || 1250;
  const liveStress      = useGlucoseStore((s: any) => s.stress) || "low";
  const liveActivity    = useGlucoseStore((s: any) => s.activity) || "Stationary";
  const liveMotionLevel = useGlucoseStore((s: any) => s.motionLevel) || "Low";
  const healthScore     = useGlucoseStore((s: any) => s.healthScore) || 92;
  const healthCategory  = useGlucoseStore((s: any) => s.healthCategory) || "Optimal";
  const riskLevel       = currentGlucose > 140 ? "High" : currentGlucose < 70 ? "High" : currentGlucose > 120 ? "Moderate" : "Low";

  const isReal = sensorMode === "REAL_ESP32";
  const isHardwareConnected = isReal && esp32Status === "CONNECTED" && esp32Data != null;

  // Resolve active parameters based on mode (REAL_ESP32 vs SIMULATION)
  const reportHeartRate = isReal
    ? (isHardwareConnected ? (esp32Data.heartRate || 0) : 0)
    : liveHeartRate;

  const reportTemperature = isReal
    ? (isHardwareConnected ? (esp32Data.temperature ?? 36.6) : 0)
    : liveTemperature;

  const reportGsr = isReal
    ? (isHardwareConnected ? (esp32Data.gsr ?? 1250) : 0)
    : liveGsr;

  const reportStress = isReal
    ? (isHardwareConnected
        ? (esp32Data.state?.includes("STRESS") ? "high" : esp32Data.gsr > 2000 ? "high" : esp32Data.gsr > 800 ? "moderate" : "low")
        : "unavailable")
    : liveStress;

  const reportActivity = isReal
    ? (isHardwareConnected ? (esp32Data.derivedActivity || "Stationary") : "Disconnected")
    : liveActivity;

  const reportMotionLevel = isReal
    ? (isHardwareConnected ? (esp32Data.motionLevel || "Low") : "--")
    : liveMotionLevel;

  const isHeartRateValid = isReal
    ? (isHardwareConnected && esp32Data.heartRate > 0 && esp32Data.state !== "NO CONTACT")
    : (liveHeartRate > 0);

  const healthExplanation     = useGlucoseStore((s: any) => s.healthExplanation)     || "Your physiological sensors are actively monitoring your baseline.";
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

  const bmi = user && (user as any).weight && (user as any).height
    ? ((user as any).weight / Math.pow((user as any).height / 100, 2)).toFixed(1)
    : null;

  const effectiveAlerts = useMemo(() => {
    const list = [...alerts];

    // High Glucose Risk Alert
    if (currentGlucose > 140) {
      if (!list.some((a) => a.id === "active-high-glucose")) {
        list.unshift({
          id: "active-high-glucose",
          type: "warning",
          title: "Elevated Glucose Warning (High Risk)",
          message: `Personalized ML prediction indicates high glucose level at ${currentGlucose} mg/dL — exceeds 140 mg/dL upper boundary.`,
          time: Date.now()
        });
      }
      if (!list.some((a) => a.id === "active-glucose-trajectory")) {
        list.push({
          id: "active-glucose-trajectory",
          type: "warning",
          title: "Rising Glycemic Trajectory Warning",
          message: `Continuous telemetric trend reflects upward glycemic trajectory (${currentGlucose} mg/dL). Monitor post-meal activity and fluid intake.`,
          time: Date.now()
        });
      }
    } 
    
    // Low Glucose Risk Alert
    if (currentGlucose < 70) {
      if (!list.some((a) => a.id === "active-low-glucose")) {
        list.unshift({
          id: "active-low-glucose",
          type: "critical",
          title: "Low Glucose Critical Alert (Hypoglycemia Risk)",
          message: `Personalized ML prediction indicates low glucose level dropped to ${currentGlucose} mg/dL — below 70 mg/dL lower boundary.`,
          time: Date.now()
        });
      }
    }

    // Skin Temperature Alert
    if (liveTemperature > 37.2 || liveTemperature < 35.5) {
      if (!list.some((a) => a.id === "active-high-temp")) {
        list.push({
          id: "active-high-temp",
          type: "warning",
          title: "Skin Temperature Variation Alert",
          message: `LM35 thermal probe recorded skin temperature at ${liveTemperature} °C (Normal range: 36.1–37.2 °C).`,
          time: Date.now()
        });
      }
    }

    return list;
  }, [alerts, currentGlucose, liveTemperature]);

  const reportId    = useMemo(() => `PIQ-${Math.floor(100000 + Math.random() * 900000)}`, []);
  const generatedAt = new Date().toLocaleString([], { dateStyle: "long", timeStyle: "short" });

  const handleDownloadPDF = () => {
    generatePDFReport({
      user, currentGlucose, trend: trendVal, healthScore, healthCategory,
      healthExplanation, healthRecommendations,
      heartRate: reportHeartRate,
      temperature: reportTemperature,
      stress: reportStress,
      activity: reportActivity,
      motionLevel: reportMotionLevel,
      gsr: reportGsr,
      confidence, calibration, history, alerts: effectiveAlerts,
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
        <SpotlightCard className="bg-gradient-to-br from-primary/8 via-card to-card sm:p-8">
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
        </SpotlightCard>

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
        <SpotlightCard className="sm:p-8">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Glucose Trend — Last 24 Hours</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Personalized ML model estimates & insights</p>
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
        </SpotlightCard>

        {/* Physiological Parameters (4 Cards) */}
        <motion.section {...fadeUp} transition={{ duration: 0.45, delay: 0.2 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold">Physiological Parameters</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50">
              {isReal ? (isHardwareConnected ? "Real ESP32 Telemetry" : "ESP32 Disconnected (--)") : "Simulated Demo Telemetry"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <VitalCard 
              icon={<Heart className="h-5 w-5 text-rose-500" />}       
              label={`Heart Rate ${isReal ? "(GPIO 34)" : ""}`}   
              value={isHeartRateValid ? `${reportHeartRate}` : isReal ? (isHardwareConnected ? "No Contact" : "--") : "No Signal"}           
              unit={isHeartRateValid ? "BPM" : ""}   
              sub={isReal ? (isHardwareConnected ? (isHeartRateValid ? "PPG Pulse Waveform" : "No Contact / Standby") : "Hardware Offline") : "Simulated Cardiac Stream"} 
            />
            <VitalCard 
              icon={<Thermometer className="h-5 w-5 text-orange-500" />} 
              label={`Skin Temp ${isReal ? "(GPIO 15)" : ""}`}  
              value={isReal ? (isHardwareConnected ? `${reportTemperature}` : "--") : `${reportTemperature}`} 
              unit={isReal && !isHardwareConnected ? "" : "°C"} 
              sub={isReal ? (isHardwareConnected ? "LM35 Thermal Probe" : "Hardware Offline") : "Simulated Skin Temp"} 
            />
            <VitalCard 
              icon={<Brain className="h-5 w-5 text-purple-500" />}     
              label={`Stress Level ${isReal ? "(GPIO 13)" : ""}`} 
              value={isReal ? (isHardwareConnected ? (reportStress.charAt(0).toUpperCase() + reportStress.slice(1)) : "--") : (reportStress.charAt(0).toUpperCase() + reportStress.slice(1))}        
              unit=""   
              sub={isReal ? (isHardwareConnected ? `GSR: ${reportGsr} ADC` : "Hardware Offline") : "Simulated GSR Stream"} 
            />
            <VitalCard 
              icon={<Zap className="h-5 w-5 text-amber-500" />}        
              label="Activity / Motion"     
              value={isReal ? (isHardwareConnected ? reportActivity : "--") : reportActivity}      
              unit=""   
              sub={isReal ? (isHardwareConnected ? `Motion: ${reportMotionLevel}` : "Hardware Offline") : `Motion: ${reportMotionLevel} (Sim)`} 
            />
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
                { icon: <Droplets className="h-4 w-4 text-primary" />,      text: `Personalized Glucose Estimate: ${currentGlucose} mg/dL — trend is ${trendVal.toLowerCase()}.` },
                { icon: <Thermometer className="h-4 w-4 text-orange-500" />, text: `LM35 Skin temperature: ${liveTemperature} °C — ${liveTemperature > 37.2 ? "slightly elevated." : "within normal range."}` },
                { icon: <ShieldCheck className="h-4 w-4 text-success" />,    text: `${stats.inRange || 0}% of estimates in healthy range over last 24 hours.` },
                { icon: <Brain className="h-4 w-4 text-purple-500" />,      text: `Estimated Stress Level (GSR): ${liveStress.toUpperCase()} — modulates prediction baseline.` },
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
            <h2 className="mb-4 font-display text-lg font-semibold">Sensor Hardware Sources</h2>
            <div className="space-y-2.5">
              {[
                { name: "Heart Rate Sensor",       source: "Heart Rate Sensor", ok: isHeartRateValid },
                { name: "Skin Temperature Sensor", source: "LM35",              ok: true },
                { name: "Galvanic Skin Response",  source: "GSR Sensor",        ok: true },
                { name: "Motion & Accelerometer",   source: "MPU6050",           ok: true },
                { name: "PulseIQ Hardware Unit",   source: "ESP32 Wi-Fi",       ok: esp32Status === "CONNECTED" },
              ].map((s) => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">{s.name} <span className="text-xs text-primary">({s.source})</span></span>
                  <span className={`flex items-center gap-1 text-xs font-semibold ${s.ok ? "text-success" : "text-amber-500"}`}>
                    {s.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
                    {s.ok ? "Active" : "Standby"}
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
          {effectiveAlerts.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl bg-success/10 p-4">
              <ShieldCheck className="h-5 w-5 text-success shrink-0" />
              <p className="text-sm font-medium text-success">No alerts detected. All readings within acceptable ranges.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {effectiveAlerts.map((alert) => (
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
            key={showPreview ? "preview-open" : "preview-closed"}
            user={user}
            currentGlucose={currentGlucose}
            trendVal={trendVal}
            stats={stats}
            history={history}
            healthScore={healthScore}
            healthCategory={healthCategory}
            healthExplanation={healthExplanation}
            healthRecommendations={healthRecommendations}
            heartRate={reportHeartRate}
            isHeartRateValid={isHeartRateValid}
            temperature={reportTemperature}
            stress={reportStress}
            activity={reportActivity}
            motionLevel={reportMotionLevel}
            gsr={reportGsr}
            confidence={confidence}
            calibration={calibration}
            alerts={effectiveAlerts}
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

// ── PDF Preview Modal ──────────────────────────────────────────────────────
function PDFPreviewModal({ user, currentGlucose, trendVal, stats, history,
  healthScore, healthCategory, healthExplanation, healthRecommendations,
  heartRate, isHeartRateValid, temperature, stress, activity, motionLevel, gsr, confidence, calibration, alerts,
  fbEntries, riskLevel, bmi, reportId, generatedAt, onClose, onDownload }: any) {

  // Snapshot the PDF Data URI ONCE on mount so real-time sensor updates don't reload/glitch the iframe!
  const [pdfDataUri] = useState<string | null>(() => {
    try {
      const res = generatePDFDataURI({
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
        activity,
        motionLevel,
        gsr,
        confidence,
        calibration,
        history,
        alerts,
        calibrationEntries: fbEntries,
      });
      return res.dataUri;
    } catch (err) {
      console.error("Failed to generate PDF Data URI for preview:", err);
      return null;
    }
  });

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handlePrint = () => {
    const iframe = document.getElementById("pdf-preview-frame") as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Screen-fitting Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 lg:p-6 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="pointer-events-auto flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        >
          {/* Modal Toolbar */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">PulseIQ Diagnostic Report Preview</p>
                <p className="text-xs text-slate-500">Report ID: {reportId} · Native A4 PDF Document</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
              >
                <Printer className="h-3.5 w-3.5" /> Print
              </button>
              <button
                onClick={onDownload}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity shadow-soft"
              >
                <Download className="h-3.5 w-3.5" /> Export PDF
              </button>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Embedded PDF Iframe */}
          <div className="flex-1 bg-slate-900/10 p-2 sm:p-4 overflow-hidden">
            {pdfDataUri ? (
              <iframe
                id="pdf-preview-frame"
                src={pdfDataUri}
                title="PulseIQ PDF Diagnostic Report Preview"
                className="h-full w-full rounded-2xl border border-slate-200 bg-white shadow-xl"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Compiling PDF Diagnostic Report...</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
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
    <SpotlightCard className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">{icon} {label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`font-display tnum text-2xl font-bold ${tone || ""}`}>{value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </SpotlightCard>
  );
}

function VitalCard({ icon, label, value, unit, sub }: { icon: React.ReactNode; label: string; value: string; unit: string; sub: string }) {
  return (
    <SpotlightCard className="p-4 text-center">
      <div className="mb-2 flex justify-center">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-bold tnum capitalize">{value}{unit && <span className="text-xs font-normal ml-0.5">{unit}</span>}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground capitalize">{sub}</p>
    </SpotlightCard>
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
