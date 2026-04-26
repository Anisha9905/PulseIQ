import { motion } from "framer-motion";
import { useState } from "react";
import { Mail, Phone, Calendar, User as UserIcon, Edit3, Check, Wifi, WifiOff } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProfileAvatar3D } from "@/components/ProfileAvatar3D";
import { DeviceRing3D } from "@/components/DeviceRing3D";
import { useGlucoseStore } from "@/store/glucoseStore";
import { useRealtimeGlucose } from "@/hooks/useRealtimeGlucose";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

export default function Profile() {
  useRealtimeGlucose();
  const user = useGlucoseStore((s) => s.user);
  const updateUser = useGlucoseStore((s) => s.updateUser);
  const connected = useGlucoseStore((s) => s.connected);
  const setConnected = useGlucoseStore((s) => s.setConnected);
  const calibration = useGlucoseStore((s) => s.calibration);
  const confidence = useGlucoseStore((s) => s.confidence);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    age: user?.age?.toString() || "",
  });

  const save = () => {
    updateUser({
      name: draft.name,
      phone: draft.phone,
      age: draft.age ? Number(draft.age) : undefined,
    });
    setEditing(false);
  };

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-6 py-8 lg:py-12">
        {/* Hero */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card to-accent/40 p-8 shadow-card sm:p-10"
        >
          <div className="grid items-center gap-8 sm:grid-cols-[auto_1fr]">
            <div className="relative h-[220px] w-[220px] sm:h-[260px] sm:w-[260px]">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-glow/20 to-transparent blur-2xl" />
              <ProfileAvatar3D
                imageUrl={user?.avatar}
                gender={user?.gender}
                age={user?.age}
                className="relative h-full w-full"
              />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-primary">Personal control center</p>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                {user?.name || "Welcome"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {user?.email}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Chip icon={UserIcon} label={user?.gender ? user.gender : "—"} />
                <Chip icon={Calendar} label={user?.dob || "DOB —"} />
                <Chip icon={Phone} label={user?.phone || "Phone —"} />
              </div>
            </div>
          </div>
        </motion.section>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Editable fields */}
          <motion.section
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8 lg:col-span-2"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Personal details</h2>
              <button
                onClick={() => (editing ? save() : setEditing(true))}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-smooth hover:bg-accent"
              >
                {editing ? <><Check className="h-3.5 w-3.5" />Save</> : <><Edit3 className="h-3.5 w-3.5" />Edit</>}
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <EditField label="Full name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} editing={editing} icon={UserIcon} />
              <EditField label="Age" value={draft.age} onChange={(v) => setDraft({ ...draft, age: v })} editing={editing} icon={Calendar} type="number" />
              <EditField label="Phone" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} editing={editing} icon={Phone} />
              <EditField label="Email" value={user?.email || ""} onChange={() => {}} editing={false} icon={Mail} />
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <ProgressMeter label="Calibration" value={calibration} hint="Learning your baseline" />
              <ProgressMeter label="Model confidence" value={confidence} hint="Predictions improving" />
            </div>
          </motion.section>

          {/* Device status */}
          <motion.section
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8"
          >
            <div className="mb-2 flex items-center gap-2">
              {connected ? <Wifi className="h-4 w-4 text-success" /> : <WifiOff className="h-4 w-4 text-destructive" />}
              <h2 className="font-display text-lg font-semibold">Armband</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              {connected ? "Streaming continuous data" : "Signal lost — check your device"}
            </p>

            <div className="my-6 h-[200px] w-full">
              <DeviceRing3D connected={connected} className="h-full w-full" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-border bg-background/50 px-4 py-3">
                <span className="text-xs text-muted-foreground">Status</span>
                <span className={`flex items-center gap-1.5 text-xs font-semibold ${connected ? "text-success" : "text-destructive"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-success animate-pulse" : "bg-destructive"}`} />
                  {connected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <button
                onClick={() => setConnected(!connected)}
                className="w-full rounded-2xl border border-border bg-background/50 px-4 py-3 text-xs font-medium text-muted-foreground transition-smooth hover:bg-accent hover:text-foreground"
              >
                {connected ? "Simulate disconnect" : "Reconnect"}
              </button>
            </div>
          </motion.section>
        </div>
      </main>
    </AppShell>
  );
}

function Chip({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function EditField({
  label,
  value,
  onChange,
  editing,
  icon: Icon,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  editing: boolean;
  icon: React.ElementType;
  type?: string;
}) {
  return (
    <div>
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </span>
      {editing ? (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-2xl border border-border bg-background/60 px-4 text-sm outline-none transition-smooth focus:border-primary/60 focus:shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]"
        />
      ) : (
        <div className="flex h-11 items-center rounded-2xl border border-transparent bg-accent/40 px-4 text-sm">
          {value || <span className="text-muted-foreground">—</span>}
        </div>
      )}
    </div>
  );
}

function ProgressMeter({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/50 p-4">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-display tnum text-sm font-semibold">{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow"
        />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
