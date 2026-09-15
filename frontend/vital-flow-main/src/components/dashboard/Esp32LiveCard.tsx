import React from "react";
import { motion } from "framer-motion";
import { Cpu, Wifi, WifiOff, RefreshCw, Activity, Thermometer, Zap, ShieldAlert, Radio } from "lucide-react";
import { useGlucoseStore } from "@/store/glucoseStore";
import { switchSensorMode } from "@/hooks/useRealtimeGlucose";

export const Esp32LiveCard: React.FC = () => {
  const sensorMode = useGlucoseStore((s) => s.sensorMode);
  const esp32Status = useGlucoseStore((s) => s.esp32Status);
  const esp32Data = useGlucoseStore((s) => s.esp32Data);

  const handleModeToggle = (mode: "SIMULATION" | "REAL_ESP32") => {
    switchSensorMode(mode);
  };

  const getStatusBadge = () => {
    if (sensorMode === "SIMULATION") {
      return (
        <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Radio className="h-3.5 w-3.5 animate-pulse text-primary" />
          <span>SIMULATED DATA</span>
        </div>
      );
    }

    if (esp32Status === "CONNECTED") {
      return (
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500 border border-emerald-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Wifi className="h-3.5 w-3.5 text-emerald-500" />
          <span>CONNECTED (PulseIQ_ESP32)</span>
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
        <span>DISCONNECTED</span>
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
      {/* Top Header & Mode Toggle Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <Cpu className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-semibold tracking-tight">ESP32 Hardware Integration</h3>
              <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Bluetooth Classic
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              PulseIQ_ESP32 Telemetry & Real-Time Trend Stream
            </p>
          </div>
        </div>

        {/* Mode Selector Toggle Switch */}
        <div className="flex items-center rounded-2xl bg-muted/60 p-1 border border-border/40">
          <button
            onClick={() => handleModeToggle("SIMULATION")}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
              sensorMode === "SIMULATION"
                ? "bg-background text-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            SIMULATION
          </button>
          <button
            onClick={() => handleModeToggle("REAL_ESP32")}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
              sensorMode === "REAL_ESP32"
                ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            REAL ESP32
          </button>
        </div>
      </div>

      {/* Connection Status Badge & Sub-header */}
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
            {esp32Data?.temperature != null ? `${esp32Data.temperature} °C` : sensorMode === "REAL_ESP32" ? "--" : "36.6 °C"}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">LM35 Thermal Probe</p>
        </div>

        {/* Live GSR Sensor */}
        <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 transition-all hover:bg-muted/40">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Zap className="h-4 w-4 text-cyan-500" />
            <span>GSR Sensor (GPIO 13)</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-foreground">
            {esp32Data?.gsr != null ? esp32Data.gsr : sensorMode === "REAL_ESP32" ? "--" : "1345"}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">Galvanic Skin Conductance</p>
        </div>

        {/* Live Heart Rate */}
        <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 transition-all hover:bg-muted/40">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Activity className="h-4 w-4 text-rose-500" />
            <span>Pulse Sensor (GPIO 34)</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-foreground">
            {esp32Data?.heartRate != null ? `${esp32Data.heartRate} BPM` : sensorMode === "REAL_ESP32" ? "--" : "76 BPM"}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">Optical Pulse Waveform</p>
        </div>

        {/* Motion / Acceleration Vector */}
        <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 transition-all hover:bg-muted/40">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Cpu className="h-4 w-4 text-purple-500" />
            <span>MPU6050 Motion & State</span>
          </div>
          <div className="mt-2 text-sm font-bold font-mono text-foreground truncate">
            {esp32Data?.state ? `STATE: ${esp32Data.state}` : sensorMode === "REAL_ESP32" ? "--" : "STATE: CALM"}
          </div>
          <p className="mt-1 text-[10px] font-mono text-muted-foreground truncate">
            {esp32Data?.accelX != null
              ? `XYZ: ${esp32Data.accelX}, ${esp32Data.accelY}, ${esp32Data.accelZ}`
              : "XYZ: -7560, -3616, -13396"}
          </p>
        </div>
      </div>

      {/* Disconnection Warning Banner if in REAL_ESP32 mode and disconnected */}
      {sensorMode === "REAL_ESP32" && esp32Status !== "CONNECTED" && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-600 dark:text-amber-400">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-500" />
          <span>
            ESP32 Bluetooth receiver is disconnected. Ensure <code className="font-mono bg-muted px-1.5 py-0.5 rounded">python hardware/bluetooth_receiver.py</code> is running and paired with device <strong>PulseIQ_ESP32</strong>.
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
