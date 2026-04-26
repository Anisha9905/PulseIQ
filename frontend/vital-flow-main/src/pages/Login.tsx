import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Loader2, Upload, Check, LogIn, UserPlus } from "lucide-react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { BreathingOrb } from "@/components/BreathingOrb";
import { ProfileAvatar3D } from "@/components/ProfileAvatar3D";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useGlucoseStore } from "@/store/glucoseStore";

type Mode = "login" | "signup";
type SignupStep = 0 | 1 | 2 | 3; // 0=credentials, 1=identity, 2=contact, 3=avatar

export default function Login() {
  const navigate = useNavigate();
  const setUser = useGlucoseStore((s) => s.setUser);
  const setOnboardingComplete = useGlucoseStore((s) => s.setOnboardingComplete);

  // ── Mode toggle ──────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("signup");

  // ── Shared credentials ───────────────────────────────────────────────────────
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");

  // ── Sign-Up steps ────────────────────────────────────────────────────────────
  const [step, setStep]       = useState<SignupStep>(0);
  const [name, setName]       = useState("");
  const [age, setAge]         = useState("");
  const [gender, setGender]   = useState<"male" | "female" | "other">("other");
  const [dob, setDob]         = useState("");
  const [phone, setPhone]     = useState("");
  const [avatar, setAvatar]   = useState<string | undefined>();

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const totalSteps = 4;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const clearError = () => setError(null);

  const handleAvatar = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setStep(0);
    setError(null);
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LOGIN FLOW
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleLogin = async () => {
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    setError(null);
    try {
      // 1. Sign in with Firebase Auth
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const uid = credential.user.uid;

      // 2. Fetch stored profile from Firestore
      const profileSnap = await getDoc(doc(db, "profiles", uid));
      if (profileSnap.exists()) {
        const p = profileSnap.data();
        setUser({
          name:   p.full_name  || email.split("@")[0],
          email:  email,
          age:    p.age        || undefined,
          gender: p.gender     || "other",
          dob:    p.dob        || "",
          phone:  p.phone      || "",
          avatar: p.profile_image_url || undefined,
        });
      } else {
        // Profile not saved yet — set minimal user
        setUser({ name: email.split("@")[0], email });
      }

      // 3. Update last_login_at
      await setDoc(doc(db, "users", uid), { last_login_at: Timestamp.now() }, { merge: true });

      setOnboardingComplete(true);
      navigate("/dashboard");
    } catch (err: any) {
      const msg = err.message?.replace("Firebase: ", "") || "Login failed.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found") {
        setError("No account found with these credentials. Please check and try again.");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SIGN-UP FLOW
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const signupCanContinue = (() => {
    if (step === 0) return email.length > 3 && password.length > 5;
    if (step === 1) return name.length > 1 && Number(age) > 0;
    if (step === 2) return dob.length > 0 && phone.length > 4;
    return true;
  })();

  const signupNext = async () => {
    if (step === 0) {
      // Create the Firebase Auth account on Step 0
      setLoading(true);
      setError(null);
      try {
        await createUserWithEmailAndPassword(auth, email, password);
      } catch (err: any) {
        if (err.code === "auth/email-already-in-use") {
          setError("This email is already registered. Use 'Already have an account?' below.");
        } else {
          setError(err.message?.replace("Firebase: ", "") || "Signup failed.");
        }
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    setStep((s) => (Math.min(3, s + 1)) as SignupStep);
  };

  const signupFinish = async () => {
    setLoading(true);
    const now = Timestamp.now();
    const firebaseUser = auth.currentUser;
    const uid = firebaseUser?.uid || "demo_" + Date.now();

    try {
      await setDoc(doc(db, "users", uid), {
        user_id: uid,
        email,
        phone: phone || "",
        created_at: now,
        last_login_at: now,
        auth_provider: "email",
      });

      await setDoc(doc(db, "profiles", uid), {
        full_name: name || email.split("@")[0],
        age: Number(age) || 0,
        gender,
        dob,
        phone,
        profile_image_url: avatar || "",
        created_at: new Date(),
      });

      await setDoc(doc(db, "user_preferences", uid), {
        preference_id: uid,
        user_id: uid,
        theme: "light",
        notification_enabled: true,
        reminder_enabled: true,
        language: "en",
        updated_at: now,
      });

      await setDoc(doc(db, "calibration_progress", uid), {
        calibration_id: uid,
        user_id: uid,
        total_required_entries: 14,
        completed_entries: 0,
        progress_percent: 0,
        status: "pending",
        started_at: now,
      });

      console.log("Firebase: User architecture created for UID:", uid);
    } catch (err) {
      console.error("Firebase write failed:", err);
    }

    setUser({ name: name || email.split("@")[0], email, age: Number(age) || undefined, gender, dob, phone, avatar });
    setOnboardingComplete(true);
    // ✅ New users go to calibration first to train their XGBoost model
    navigate("/calibration");
  };

  // ── Visual side ──────────────────────────────────────────────────────────────
  const showAvatar = mode === "signup" && (step === 3 || !!avatar);

  return (
    <div className="relative min-h-screen overflow-hidden bg-aurora">
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-primary-glow/20 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-primary-glow shadow-soft" />
          <span className="font-display text-lg font-semibold tracking-tight">PulseIQ</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-6xl items-center justify-center px-6 lg:px-10">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2">

          {/* ── Left: Visualization ───────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1] }}
            className="order-2 relative flex h-[400px] items-center justify-center lg:order-1 lg:h-[600px]"
          >
            {/* 3D Orb / Avatar */}
            <div className="absolute inset-0 z-0 flex items-center justify-center opacity-60">
              {showAvatar ? (
                <ProfileAvatar3D imageUrl={avatar} gender={gender} age={age ? Number(age) : 30} className="h-full w-full" />
              ) : (
                <BreathingOrb className="h-full w-full" />
              )}
            </div>

            {/* Doctors illustration */}
            <div className="absolute inset-0 m-auto z-10 w-full max-w-[480px] scale-110" style={{ pointerEvents: "none" }}>
              <img
                src="/doctors.png"
                alt="Medical Care"
                className="relative h-full w-full object-contain mix-blend-multiply"
                style={{
                  WebkitMaskImage: "radial-gradient(ellipse at center, black 45%, transparent 70%)",
                  maskImage: "radial-gradient(ellipse at center, black 45%, transparent 70%)",
                }}
              />
              <div
                className="absolute inset-0 bg-white/30 mix-blend-overlay"
                style={{
                  WebkitMaskImage: "radial-gradient(ellipse at center, black 45%, transparent 70%)",
                  maskImage: "radial-gradient(ellipse at center, black 45%, transparent 70%)",
                }}
              />
            </div>
          </motion.div>

          {/* ── Right: Form card ──────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="order-1 lg:order-2"
          >
            <div className="glass mx-auto max-w-md rounded-3xl p-8 shadow-card sm:p-10">

              {/* Mode Switcher Tabs */}
              <div className="mb-8 flex rounded-2xl border border-border bg-background/40 p-1">
                <button
                  onClick={() => switchMode("signup")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-smooth ${
                    mode === "signup"
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <UserPlus className="h-4 w-4" />
                  Sign Up
                </button>
                <button
                  onClick={() => switchMode("login")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-smooth ${
                    mode === "login"
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LogIn className="h-4 w-4" />
                  Log In
                </button>
              </div>

              <AnimatePresence mode="wait">

                {/* ════════════════════════════════════════
                    LOGIN MODE
                ════════════════════════════════════════ */}
                {mode === "login" && (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h1 className="text-display mb-1 text-3xl font-semibold">Welcome back.</h1>
                    <p className="mb-6 text-sm text-muted-foreground">
                      Sign in to continue monitoring your glucose.
                    </p>

                    <div className="space-y-4">
                      <Field label="Email" type="email" value={email} onChange={(v) => { setEmail(v); clearError(); }} placeholder="you@example.com" />
                      <Field label="Password" type="password" value={password} onChange={(v) => { setPassword(v); clearError(); }} placeholder="••••••••" />
                      {error && (
                        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={loading || !email || !password}
                      onClick={handleLogin}
                      className="group mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground shadow-soft transition-smooth hover:shadow-glow hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <span className="text-sm font-medium">Log In to PulseIQ</span>
                          <LogIn className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </button>

                    <p className="mt-5 text-center text-xs text-muted-foreground">
                      Don't have an account?{" "}
                      <button onClick={() => switchMode("signup")} className="font-medium text-primary hover:underline">
                        Sign up free
                      </button>
                    </p>
                  </motion.div>
                )}

                {/* ════════════════════════════════════════
                    SIGN-UP MODE — multi-step
                ════════════════════════════════════════ */}
                {mode === "signup" && (
                  <motion.div
                    key="signup"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Progress bar */}
                    <div className="mb-5 flex items-center gap-2">
                      {Array.from({ length: totalSteps }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-smooth ${
                            i <= step ? "bg-primary" : "bg-border"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">
                      Step {step + 1} of {totalSteps}
                    </p>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -16 }}
                        transition={{ duration: 0.25 }}
                      >
                        {/* Step 0 — Credentials */}
                        {step === 0 && (
                          <>
                            <h1 className="text-display mb-1 text-3xl font-semibold sm:text-4xl">Create account.</h1>
                            <p className="mb-6 text-sm text-muted-foreground">
                              Start your personalized glucose journey.
                            </p>
                            <div className="space-y-4">
                              <Field label="Email" type="email" value={email} onChange={(v) => { setEmail(v); clearError(); }} placeholder="you@example.com" />
                              <Field label="Password (min 6 chars)" type="password" value={password} onChange={(v) => { setPassword(v); clearError(); }} placeholder="••••••••" />
                              {error && (
                                <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
                              )}
                            </div>
                          </>
                        )}

                        {/* Step 1 — Identity */}
                        {step === 1 && (
                          <>
                            <h1 className="text-display mb-1 text-3xl font-semibold">Tell us about you.</h1>
                            <p className="mb-6 text-sm text-muted-foreground">
                              This helps PulseIQ learn your unique baseline.
                            </p>
                            <div className="space-y-4">
                              <Field label="Full name" value={name} onChange={setName} placeholder="Your name" />
                              <div className="grid grid-cols-2 gap-3">
                                <Field label="Age" type="number" value={age} onChange={setAge} placeholder="25" />
                                <div>
                                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Gender</span>
                                  <div className="flex gap-1.5">
                                    {(["male", "female", "other"] as const).map((g) => (
                                      <button
                                        key={g}
                                        type="button"
                                        onClick={() => setGender(g)}
                                        className={`h-12 flex-1 rounded-2xl border text-xs font-medium capitalize transition-smooth ${
                                          gender === g
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border text-muted-foreground hover:border-primary/40"
                                        }`}
                                      >
                                        {g}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {/* Step 2 — Contact */}
                        {step === 2 && (
                          <>
                            <h1 className="text-display mb-1 text-3xl font-semibold">A few more details.</h1>
                            <p className="mb-6 text-sm text-muted-foreground">
                              Used for time-of-day patterns and emergency contact.
                            </p>
                            <div className="space-y-4">
                              <Field label="Date of birth" type="date" value={dob} onChange={setDob} />
                              <Field label="Phone number" type="tel" value={phone} onChange={setPhone} placeholder="+91 98765 43210" />
                            </div>
                          </>
                        )}

                        {/* Step 3 — Avatar */}
                        {step === 3 && (
                          <>
                            <h1 className="text-display mb-1 text-3xl font-semibold">Make it yours.</h1>
                            <p className="mb-6 text-sm text-muted-foreground">
                              Add a profile photo or continue with your animated avatar.
                            </p>
                            <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-background/40 text-muted-foreground transition-smooth hover:border-primary/60 hover:text-primary">
                              {avatar ? (
                                <>
                                  <Check className="h-6 w-6 text-primary" />
                                  <span className="text-xs">Photo added — tap to replace</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="h-6 w-6" />
                                  <span className="text-xs">Upload profile photo (optional)</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => e.target.files?.[0] && handleAvatar(e.target.files[0])}
                              />
                            </label>
                          </>
                        )}
                      </motion.div>
                    </AnimatePresence>

                    {/* Navigation buttons */}
                    <div className="mt-6 flex items-center gap-3">
                      {step > 0 && (
                        <button
                          onClick={() => setStep((s) => (Math.max(0, s - 1)) as SignupStep)}
                          className="h-12 rounded-2xl border border-border px-5 text-sm font-medium text-muted-foreground transition-smooth hover:bg-accent hover:text-foreground"
                        >
                          Back
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={!signupCanContinue || loading}
                        onClick={step === 3 ? signupFinish : signupNext}
                        className="group relative flex h-12 flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-soft transition-smooth hover:shadow-glow hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <span className="text-sm font-medium">
                              {step === 3 ? "Enter PulseIQ" : "Continue"}
                            </span>
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                          </>
                        )}
                      </button>
                    </div>

                    <p className="mt-5 text-center text-xs text-muted-foreground">
                      Already have an account?{" "}
                      <button onClick={() => switchMode("login")} className="font-medium text-primary hover:underline">
                        Log in here
                      </button>
                    </p>
                  </motion.div>
                )}

              </AnimatePresence>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                Protected by end-to-end encryption.
              </p>
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-border bg-background/60 px-4 text-sm text-foreground outline-none transition-smooth placeholder:text-muted-foreground/60 focus:border-primary/60 focus:bg-background focus:shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]"
      />
    </label>
  );
}
