import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useGlucoseStore } from "@/store/glucoseStore";
import { motion } from "framer-motion";
import { SpotlightCard } from "@/components/SpotlightCard";

export function TrendChart() {
  const trend = useGlucoseStore((s) => s.trend);
  const data = trend.map((r) => ({
    time: new Date(r.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    value: r.value,
  }));

  return (
    <SpotlightCard className="sm:p-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">Last 60 minutes</h3>
          <p className="text-sm text-muted-foreground">Continuous glucose stream</p>
        </div>
        <div className="text-right">
          <div className="text-display tnum text-2xl font-semibold">
            {Math.round(data.reduce((a, b) => a + b.value, 0) / Math.max(data.length, 1))}
          </div>
          <div className="text-xs text-muted-foreground">avg mg/dL</div>
        </div>
      </div>

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="glucoseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              domain={[60, 180]}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                fontSize: 12,
                boxShadow: "var(--shadow-soft)",
              }}
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
              cursor={{ stroke: "hsl(var(--primary))", strokeOpacity: 0.3, strokeWidth: 1 }}
            />
            <ReferenceLine y={70} stroke="hsl(var(--glucose-low))" strokeDasharray="3 4" strokeOpacity={0.4} />
            <ReferenceLine y={140} stroke="hsl(var(--glucose-high))" strokeDasharray="3 4" strokeOpacity={0.4} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              fill="url(#glucoseGrad)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SpotlightCard>
  );
}
