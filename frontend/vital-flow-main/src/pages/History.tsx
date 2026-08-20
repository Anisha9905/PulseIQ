import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown, Activity, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useGlucoseStore } from "@/store/glucoseStore";
import { useRealtimeGlucose } from "@/hooks/useRealtimeGlucose";
import { CalibrationTrendChart } from "@/components/dashboard/CalibrationTrendChart";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

type Range = "day" | "week";

export default function History() {
  useRealtimeGlucose();
  const history = useGlucoseStore((s) => s.history);
  const entries = useGlucoseStore((s) => s.entries);
  const [range, setRange] = useState<Range>("day");

  // ── Existing chart logic ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff = range === "day" ? 24 * 3600_000 : 7 * 24 * 3600_000;
    return history.filter((r) => now - r.time <= cutoff);
  }, [history, range]);

  const chartData = filtered.map((r) => ({
    label:
      range === "day"
        ? new Date(r.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : new Date(r.time).toLocaleDateString([], { weekday: "short", hour: "2-digit" }),
    value: r.value,
    time: r.time,
  }));

  const stats = useMemo(() => {
    if (!filtered.length) return { avg: 0, min: 0, max: 0, inRange: 0 };
    const values = filtered.map((r) => r.value);
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const inRange = Math.round((values.filter((v) => v >= 70 && v <= 140).length / values.length) * 100);
    return { avg, min, max, inRange };
  }, [filtered]);

  const heatmap = useMemo(() => {
    const grid: { day: number; hour: number; value: number; count: number }[] = [];
    for (let d = 0; d < 7; d++)
      for (let h = 0; h < 24; h++)
        grid.push({ day: d, hour: h, value: 0, count: 0 });
    history.forEach((r) => {
      const date = new Date(r.time);
      const dayDiff = Math.floor((Date.now() - r.time) / (24 * 3600_000));
      if (dayDiff < 0 || dayDiff >= 7) return;
      const hour = date.getHours();
      const cell = grid.find((c) => c.day === dayDiff && c.hour === hour);
      if (cell) { cell.value += r.value; cell.count += 1; }
    });
    return grid.map((c) => ({ ...c, value: c.count ? c.value / c.count : 0 }));
  }, [history]);

  const insights = useMemo(() => {
    const items: { icon: React.ElementType; text: string; tone: string }[] = [];
    const morning = history.filter((r) => { const h = new Date(r.time).getHours(); return h >= 6 && h <= 10; });
    const lunch   = history.filter((r) => { const h = new Date(r.time).getHours(); return h >= 12 && h <= 15; });
    if (morning.length) {
      const avg = Math.round(morning.reduce((a, b) => a + b.value, 0) / morning.length);
      items.push({ icon: Sparkles, text: `Mornings have been steady — averaging ${avg} mg/dL.`, tone: "text-primary" });
    }
    if (lunch.length) {
      const peak = Math.max(...lunch.map((r) => r.value));
      if (peak > 140) items.push({ icon: TrendingUp, text: `Frequent post-lunch spikes detected, peaking at ${peak} mg/dL.`, tone: "text-glucose-high" });
    }
    items.push({ icon: Activity, text: `${stats.inRange}% of readings stayed in healthy range this ${range === "day" ? "day" : "week"}.`, tone: "text-success" });
    items.push({ icon: TrendingDown, text: `Evening recovery trending well — your levels return to baseline within 90 minutes.`, tone: "text-primary" });
    return items;
  }, [history, stats.inRange, range]);

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-6 py-8 lg:py-12">
        <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-primary">History</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Your data, in stories.</h1>
          </div>
          <div className="flex rounded-full border border-border bg-card p-1">
            {(["day", "week"] as const).map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition-smooth ${range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {r}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.05 }} className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Average" value={`${stats.avg}`} unit="mg/dL" />
          <Stat label="Min" value={`${stats.min}`} unit="mg/dL" />
          <Stat label="Max" value={`${stats.max}`} unit="mg/dL" />
          <Stat label="Time in range" value={`${stats.inRange}`} unit="%" tone="text-success" />
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Timeline chart */}
          <motion.section {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8 lg:col-span-2">
            <h2 className="mb-1 font-display text-lg font-semibold">Timeline</h2>
            <p className="mb-6 text-sm text-muted-foreground">{range === "day" ? "Last 24 hours" : "Last 7 days"}</p>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={50} />
                  <YAxis domain={[60, 200]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                  <ReferenceLine y={70} stroke="hsl(var(--glucose-low))" strokeDasharray="3 4" strokeOpacity={0.4} />
                  <ReferenceLine y={140} stroke="hsl(var(--glucose-high))" strokeDasharray="3 4" strokeOpacity={0.4} />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#histGrad)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {entries.length > 0 && (
              <div className="mt-6 border-t border-border pt-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Logged context</p>
                <div className="flex flex-wrap gap-2">
                  {entries.slice(0, 8).map((e) => (
                    <span key={e.id} className="rounded-full border border-border bg-accent/40 px-3 py-1 text-[11px]">
                      {entryStateLabel(e.state)} · {e.value} mg/dL
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.section>

          {/* Insights */}
          <motion.section {...fadeUp} transition={{ duration: 0.5, delay: 0.15 }}
            className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
            <h2 className="mb-1 font-display text-lg font-semibold">Key insights</h2>
            <p className="mb-6 text-sm text-muted-foreground">Generated from your patterns</p>
            <div className="space-y-3">
              {insights.map((ins, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.08 }}
                  className="flex gap-3 rounded-2xl bg-accent/30 p-3">
                  <ins.icon className={`mt-0.5 h-4 w-4 shrink-0 ${ins.tone}`} />
                  <p className="text-sm leading-relaxed">{ins.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            7-DAY CALIBRATION TREND CHART
        ════════════════════════════════════════════════════════════════════ */}
        <CalibrationTrendChart />

        {/* Heatmap */}
        <motion.section {...fadeUp} transition={{ duration: 0.5, delay: 0.25 }} className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
          <h2 className="mb-1 font-display text-lg font-semibold">Pattern heatmap</h2>
          <p className="mb-6 text-sm text-muted-foreground">7 days × 24 hours · darker = higher glucose</p>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <div className="flex gap-1 pl-10">
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h} className="w-5 text-center text-[9px] text-muted-foreground">{h % 3 === 0 ? h : ""}</div>
                ))}
              </div>
              {Array.from({ length: 7 }).map((_, d) => (
                <div key={d} className="mt-1 flex items-center gap-1">
                  <div className="w-9 text-right text-[10px] text-muted-foreground">{d === 0 ? "Today" : `-${d}d`}</div>
                  {Array.from({ length: 24 }).map((_, h) => {
                    const cell = heatmap.find((c) => c.day === d && c.hour === h);
                    const v = cell?.value || 0;
                    const intensity = v ? Math.min(1, Math.max(0.05, (v - 70) / 100)) : 0;
                    const color = v > 140 ? `hsl(var(--glucose-high) / ${0.3 + intensity * 0.6})` : v < 70 && v > 0 ? `hsl(var(--glucose-low) / ${0.3 + intensity * 0.6})` : v ? `hsl(var(--primary) / ${0.15 + intensity * 0.55})` : "hsl(var(--muted))";
                    return (
                      <motion.div key={h} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: (d * 24 + h) * 0.002 }} title={v ? `${Math.round(v)} mg/dL` : "no data"}
                        className="h-5 w-5 rounded-md transition-smooth hover:scale-125" style={{ background: color }} />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      </main>
    </AppShell>
  );
}

function Stat({ label, value, unit, tone }: { label: string; value: string; unit: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`text-display tnum text-2xl font-semibold ${tone || ""}`}>{value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function entryStateLabel(s: string) {
  const map: Record<string, string> = {
    before_food: "Before food", after_food: "After food",
    fasting: "Fasting", post_activity: "Post activity",
  };
  return map[s] || s;
}
