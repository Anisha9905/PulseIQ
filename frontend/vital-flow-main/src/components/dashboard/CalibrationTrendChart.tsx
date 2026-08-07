import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Loader2, Activity, Target, Zap, TrendingUp, CheckCircle, Clock } from "lucide-react";

interface FirebaseEntry {
  id: string;
  glucose_value: number;
  day_number: number;
  phase: number;
}

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };
const PHASE_NAMES = ["Morning", "Afternoon", "Evening", "Night"];

export function CalibrationTrendChart() {
  const [entries, setEntries] = useState<FirebaseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid || "demo_user";
    const q = query(
      collection(db, "historical_glucose_entries"),
      where("user_id", "==", uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        glucose_value: d.data().glucose_value,
        day_number: d.data().day_number ?? 1,
        phase: d.data().phase ?? 0,
      }));
      setEntries(docs);
      setLoading(false);
    }, (err) => {
      console.error("Failed to fetch realtime calibration entries:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const { chartData, stats } = useMemo(() => {
    // Initialize 28 slots
    const data = [];
    const values: number[] = [];
    
    for (let d = 1; d <= 7; d++) {
      for (let p = 0; p < 4; p++) {
        const match = entries.find(e => e.day_number === d && e.phase === p);
        const value = match ? match.glucose_value : null;
        if (value !== null) {
          values.push(value);
        }
        data.push({
          label: `Day ${d} ${PHASE_NAMES[p]}`,
          day: d,
          phaseName: PHASE_NAMES[p],
          value,
        });
      }
    }

    const count = values.length;
    const avg = count ? Math.round(values.reduce((a, b) => a + b, 0) / count) : 0;
    const min = count ? Math.min(...values) : 0;
    const max = count ? Math.max(...values) : 0;
    const completion = Math.round((count / 28) * 100);

    return { 
      chartData: data, 
      stats: { count, avg, min, max, completion } 
    };
  }, [entries]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-3xl border border-border bg-card p-6 shadow-soft">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-xl border border-border bg-card p-3 shadow-lg">
          <p className="text-xs font-medium text-muted-foreground">Day {data.day}</p>
          <p className="font-semibold text-sm mb-1">{data.phaseName}</p>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-display text-lg font-bold">
              {data.value} <span className="text-xs font-normal text-muted-foreground">mg/dL</span>
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.section 
      {...fadeUp} transition={{ duration: 0.5, delay: 0.2 }} 
      className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8"
    >
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            7-Day Calibration Trend
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Continuous view of your 28 calibration readings used for the XGBoost model.
          </p>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
          stats.count === 28 
            ? "border-success/30 bg-success/10 text-success" 
            : "border-warning/30 bg-warning/10 text-warning"
        }`}>
          {stats.count === 28 ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
          {stats.count === 28 ? "Model Training Completed" : "Model Training Pending"}
        </div>
      </div>

      <div className="mb-8 h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--primary-glow))" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} 
              axisLine={false} 
              tickLine={false} 
              interval="preserveStartEnd" 
              minTickGap={40} 
            />
            <YAxis 
              domain={[40, 200]} 
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} 
              axisLine={false} 
              tickLine={false} 
              width={40} 
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1, strokeDasharray: "4 4" }} />
            <ReferenceLine y={70} stroke="hsl(var(--glucose-low))" strokeDasharray="3 4" strokeOpacity={0.3} />
            <ReferenceLine y={140} stroke="hsl(var(--glucose-high))" strokeDasharray="3 4" strokeOpacity={0.3} />
            
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="url(#lineGrad)" 
              strokeWidth={3}
              dot={{ r: 4, fill: "hsl(var(--background))", stroke: "hsl(var(--primary))", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={true}
              animationDuration={1000}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats row below chart */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-2xl bg-accent/40 p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Readings</p>
          <p className="mt-1 text-display text-2xl font-bold">
            {stats.count}<span className="text-sm font-normal text-muted-foreground">/28</span>
          </p>
        </div>
        <div className="rounded-2xl bg-accent/40 p-4">
          <p className="text-xs text-muted-foreground">Completion</p>
          <p className="mt-1 text-display text-2xl font-bold text-primary">{stats.completion}%</p>
        </div>
        <div className="rounded-2xl bg-accent/40 p-4">
          <p className="text-xs text-muted-foreground">Average</p>
          <p className="mt-1 text-display text-2xl font-bold">{stats.avg || "--"} <span className="text-xs font-normal text-muted-foreground">mg/dL</span></p>
        </div>
        <div className="rounded-2xl bg-accent/40 p-4">
          <p className="text-xs text-muted-foreground">Minimum</p>
          <p className="mt-1 text-display text-2xl font-bold text-blue-500">{stats.min || "--"}</p>
        </div>
        <div className="rounded-2xl bg-accent/40 p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Maximum</p>
          <p className="mt-1 text-display text-2xl font-bold text-orange-500">{stats.max || "--"}</p>
        </div>
      </div>
    </motion.section>
  );
}
