import React from "react";
import { motion } from "framer-motion";
import { Cpu, Wifi, WifiOff, RefreshCw, Activity, Thermometer, Zap, ShieldAlert, Radio } from "lucide-react";
import { useGlucoseStore } from "@/store/glucoseStore";
import { switchSensorMode } from "@/hooks/useRealtimeGlucose";

export const Esp32LiveCard: React.FC = () => {
  const esp32Status = useGlucoseStore((s) => s.esp32Status);
  const esp32Data = useGlucoseStore((s) => s.esp32Data);
  const [showDebug, setShowDebug] = React.useState(false);

  const isConnected = esp32Status === "CONNECTED" && esp32Data != null;

  const displayTemp = isConnected && esp32Data.temperature != null ? `${esp32Data.temperature} °C` : "--";
  const displayGsr = isConnected && esp32Data.gsr != null ? `${esp32Data.gsr}` : "--";
  const displayHr = isConnected && esp32Data.heartRate > 0 ? `${esp32Data.heartRate} BPM` : isConnected ? "No Contact / Standby" : "--";
  const displayActivity = isConnected ? (esp32Data.derivedActivity || "Stationary") : "Hardware Offline";
  const displayMotionLevel = isConnected ? (esp32Data.motionLevel || "Low") : "--";

  const getStatusBadge = () => {
    if (esp32Status === "CONNECTED") {
      return (
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500 border border-emerald-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Wifi className="h-3.5 w-3.5 text-emerald-500" />
          <span>REAL ESP32 HARDWARE CONNECTED</span>
        </div>
      );
    }

    if (esp32Status === "RECONNECTING") {
      return (
        <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-500 border border-amber-500/20">
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-500" />
          <span>RECONNECTING...</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-500 border border-rose-500/20">
        <WifiOff className="h-3.5 w-3.5 text-rose-500" />
        <span>HARDWARE DISCONNECTED (Showing --)</span>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-soft"
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <Cpu className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-semibold tracking-tight">ESP32 Hardware Telemetry Stream</h3>
              <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Physical ESP32 Board
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live telemetry stream from GPIO 15 (LM35), GPIO 13 (GSR), GPIO 34 (PPG Pulse), and MPU6050
            </p>
          </div>
        </div>
      </div>

      {/* Connection Status Badge */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        {getStatusBadge()}
        {esp32Data?.timestamp && (
          <span className="text-[11px] font-mono text-muted-foreground">
            Last RX: {new Date(esp32Data.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Sensor Vitals Display Grid */}
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Live Temperature */}
        <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 transition-all hover:bg-muted/40">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Thermometer className="h-4 w-4 text-amber-500" />
            <span>Temperature (GPIO 15)</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-foreground">
            {displayTemp}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">LM35 Thermal Probe</p>
        </div>

        {/* Live GSR Sensor */}
        <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 transition-all hover:bg-muted/40">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Zap className="h-4 w-4 text-cyan-500" />
            <span>GSR Conductance (GPIO 13)</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-foreground">
            {displayGsr}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">Galvanic Skin Response</p>
        </div>

        {/* Live Heart Rate */}
        <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 transition-all hover:bg-muted/40">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Activity className="h-4 w-4 text-rose-500" />
            <span>Pulse / Heart Rate (GPIO 34)</span>
          </div>
          <div className="mt-2 text-xl font-bold font-mono tracking-tight text-foreground truncate">
            {displayHr}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">Optical PPG Pulse Waveform</p>
        </div>

        {/* Motion / Acceleration Vector */}
        <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 transition-all hover:bg-muted/40">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Cpu className="h-4 w-4 text-purple-500" />
            <span>Activity &amp; Motion</span>
          </div>
          <div className="mt-2 text-base font-bold tracking-tight text-foreground truncate">
            {displayActivity}
          </div>
          <p className="mt-1 text-xs text-muted-foreground font-medium">
            Motion Level: <span className="text-foreground font-semibold">{displayMotionLevel}</span>
          </p>
        </div>
      </div>

      {/* Optional Technical Debug Section Toggle */}
      <div className="mt-3 flex justify-end">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="text-[11px] font-mono text-muted-foreground hover:text-foreground underline decoration-dotted"
        >
          {showDebug ? "Hide Technical Debug Specs ▲" : "Show Technical Debug Specs (Raw Accelerometer) ▼"}
        </button>
      </div>

      {showDebug && (
        <div className="mt-2 rounded-xl bg-muted/30 p-3 font-mono text-xs text-muted-foreground border border-border/30 space-y-1">
          <p className="font-semibold text-foreground text-[11px]">MPU6050 Raw Hardware Sensor Telemetry:</p>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>Accel X: {esp32Data?.accelX ?? "--"}</div>
            <div>Accel Y: {esp32Data?.accelY ?? "--"}</div>
            <div>Accel Z: {esp32Data?.accelZ ?? "--"}</div>
            <div>Magnitude: {esp32Data?.accelMagnitude ?? "--"}</div>
          </div>
        </div>
      )}

      {/* Disconnection Warning Banner if disconnected */}
      {!isConnected && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-600 dark:text-amber-400">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-500" />
          <span>
            <strong>Waiting for physical ESP32 hardware telemetry stream.</strong> Connect your board to Wi-Fi (<code className="font-mono bg-muted px-1 py-0.5 rounded">http://10.122.73.207:5000/api/v1/telemetry</code>).
          </span>
        </div>
      )}

      {/* Clinical Disclaimer Banner */}
      <div className="mt-4 rounded-xl bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground border border-border/30">
        <strong className="text-foreground">Research Prototype Disclaimer:</strong> PulseIQ is an experimental glucose <em>trend</em> estimation system. Individual sensor telemetry (GSR, LM35 temp, PPG pulse wave) correlates with physiological state transitions but does <strong>not</strong> directly measure blood glucose levels.
      </div>
    </motion.div>
  );
};
