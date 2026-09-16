import { create } from "zustand";
import { persist } from "zustand/middleware";

export type GlucoseState = "normal" | "low" | "high";
export type EntryState = "before_food" | "after_food" | "fasting" | "post_activity";

export interface GlucoseReading {
  time: number;
  value: number;
}

export interface AlertItem {
  id: string;
  type: "info" | "warning" | "critical";
  title: string;
  message: string;
  time: number;
}

export interface ManualEntry {
  id: string;
  time: number;
  state: EntryState;
  value: number;
  note?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  age?: number;
  gender?: "male" | "female" | "other";
  dob?: string;
  phone?: string;
  avatar?: string; // data URL
}

interface GlucoseStore {
  current: number;
  trend: GlucoseReading[];
  history: GlucoseReading[]; // 7-day synthetic history
  state: GlucoseState;
  calibration: number;
  confidence: number;
  connected: boolean;
  lastSignal: number;
  alerts: AlertItem[];
  insights: string[];
  entries: ManualEntry[];
  user: UserProfile | null;
  onboardingComplete: boolean;
  sensorMode: "SIMULATION" | "REAL_ESP32";
  esp32Status: "CONNECTED" | "DISCONNECTED" | "RECONNECTING";
  esp32Data: {
    temperature: number;
    gsr: number;
    heartRate: number;
    state: string;
    accelX: number;
    accelY: number;
    accelZ: number;
    accelMagnitude?: number;
    derivedActivity?: string;
    motionLevel?: string;
    timestamp: string;
  } | null;
  heartRate: number;
  temperature: number;
  gsr: number;
  stress: string;
  activity: string;
  motionLevel: string;
  healthScore: number;
  healthCategory: string;
  healthExplanation: string;
  healthRecommendations: string[];
  setSensorMode: (mode: "SIMULATION" | "REAL_ESP32") => void;
  setEsp32Status: (status: "CONNECTED" | "DISCONNECTED" | "RECONNECTING") => void;
  setEsp32Data: (data: any) => void;
  setUser: (u: UserProfile | null) => void;
  updateUser: (patch: Partial<UserProfile>) => void;
  setOnboardingComplete: (v: boolean) => void;
  pushReading: (value: number) => void;
  pushAlert: (a: Omit<AlertItem, "id" | "time">) => void;
  dismissAlert: (id: string) => void;
  setCalibration: (v: number) => void;
  setConfidence: (v: number) => void;
  setConnected: (v: boolean) => void;
  pingSignal: () => void;
  addEntry: (e: Omit<ManualEntry, "id">) => void;
  removeEntry: (id: string) => void;
}

const classify = (v: number): GlucoseState => {
  if (v < 70) return "low";
  if (v > 140) return "high";
  return "normal";
};

const seedTrend = (): GlucoseReading[] => {
  const now = Date.now();
  const arr: GlucoseReading[] = [];
  let v = 105;
  for (let i = 60; i >= 0; i--) {
    v += (Math.random() - 0.5) * 6;
    v = Math.max(75, Math.min(150, v));
    arr.push({ time: now - i * 60_000, value: Math.round(v) });
  }
  return arr;
};

const seedHistory = (): GlucoseReading[] => {
  const now = Date.now();
  const arr: GlucoseReading[] = [];
  let v = 100;
  // 7 days, every 30 min
  for (let i = 7 * 48; i >= 0; i--) {
    const hourOfDay = new Date(now - i * 30 * 60_000).getHours();
    // simulate meal spikes
    const mealBoost =
      hourOfDay === 8 || hourOfDay === 13 || hourOfDay === 19
        ? 25 + Math.random() * 15
        : 0;
    v += (Math.random() - 0.5) * 8;
    const value = Math.max(70, Math.min(180, Math.round(v + mealBoost * Math.random())));
    arr.push({ time: now - i * 30 * 60_000, value });
    v = Math.max(80, Math.min(140, v));
  }
  return arr;
};

export const useGlucoseStore = create<GlucoseStore>()(
  persist(
    (set) => ({
      current: 108,
      trend: seedTrend(),
      history: seedHistory(),
      state: "normal",
      calibration: 42,
      confidence: 68,
      connected: true,
      lastSignal: Date.now(),
      alerts: [],
      insights: [
        "Your glucose has been stable for the past 2 hours.",
        "Slight upward trend detected after lunch — within normal range.",
        "Sleep quality last night correlates with steady morning levels.",
      ],
      entries: [],
      user: null,
      onboardingComplete: false,
      sensorMode: "REAL_ESP32",
      esp32Status: "DISCONNECTED",
      esp32Data: null,
      heartRate: 75,
      temperature: 36.6,
      gsr: 1250,
      stress: "low",
      activity: "Stationary",
      motionLevel: "Low",
      healthScore: 92,
      healthCategory: "Excellent",
      healthExplanation: "All physiological systems are operating within optimal limits.",
      healthRecommendations: ["Keep up the great work!", "Stay active and well hydrated."],
      setSensorMode: (sensorMode) => set({ sensorMode }),
      setEsp32Status: (esp32Status) => set({ esp32Status }),
      setEsp32Data: (esp32Data) => set({ esp32Data }),
      setUser: (user) => set({ user }),
      updateUser: (patch) =>
        set((s) => ({ user: s.user ? { ...s.user, ...patch } : null })),
      setOnboardingComplete: (onboardingComplete) => set({ onboardingComplete }),
      pushReading: (value) =>
        set((s) => {
          const now = Date.now();
          const reading = { time: now, value };
          const nextTrend = [...s.trend.slice(-90), reading];
          const nextHistory = [...s.history, reading].slice(-2016); // keep max ~7 days at 30-min intervals
          return { trend: nextTrend, history: nextHistory, current: value, state: classify(value), lastSignal: now };
        }),
      pushAlert: (a) => {
        const id = crypto.randomUUID();
        const time = Date.now();
        set((s) => ({
          alerts: [{ ...a, id, time }, ...s.alerts.filter((item) => item.title !== a.title)].slice(0, 20),
        }));
      },
      dismissAlert: (id) => set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),
      setCalibration: (calibration) => set({ calibration }),
      setConfidence: (confidence) => set({ confidence }),
      setConnected: (connected) => set({ connected }),
      pingSignal: () => set({ lastSignal: Date.now(), connected: true }),
      addEntry: (e) =>
        set((s) => ({
          entries: [{ ...e, id: crypto.randomUUID() }, ...s.entries].slice(0, 200),
          calibration: Math.min(100, s.calibration + 4),
          confidence: Math.min(100, s.confidence + 2),
        })),
      removeEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
    }),
    {
      name: "aura-glucose",
      partialize: (s) => ({
        user: s.user,
        onboardingComplete: s.onboardingComplete,
        entries: s.entries,
        calibration: s.calibration,
        confidence: s.confidence,
        // history is intentionally NOT persisted — it reseeds with fresh
        // timestamps on every load so the 24h chart always has data.
        // Real WebSocket readings accumulate in history during each session.
      }),
    }
  )
);
