import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity } from "lucide-react";

interface PulseIQIntroSplashProps {
  onComplete?: () => void;
  autoPlay?: boolean;
}

// ── Web Audio API: Warm Organic Heartbeat Thud Synthesis (Lub-Dub) ─────────
function playWebAudioHeartbeat() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // 1st Heartbeat Thump ("LUB")
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(70, now);
    osc1.frequency.exponentialRampToValueAtTime(32, now + 0.12);

    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    // 2nd Heartbeat Thump ("DUB")
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(90, now + 0.18);
    osc2.frequency.exponentialRampToValueAtTime(38, now + 0.28);

    gain2.gain.setValueAtTime(0.28, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.28);
  } catch (err) {
    // Fallback if blocked
  }
}

export const PulseIQIntroSplash: React.FC<PulseIQIntroSplashProps> = ({
  onComplete,
  autoPlay = true,
}) => {
  const [stage, setStage] = useState<
    "ecg-draw" | "icon-form" | "wordmark" | "glow-pulse" | "hold-logo" | "fadeout" | "complete"
  >("ecg-draw");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const soundPlayed = useRef(false);

  // Play subtle heartbeat audio (Local WAV file / Web Audio)
  const triggerAudio = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("/sounds/ecg_pulse.wav");
        audioRef.current.volume = 0.15;
      }
      audioRef.current.currentTime = 0;
      const promise = audioRef.current.play();
      if (promise !== undefined) {
        promise.catch(() => {
          // Fallback to synthesized Web Audio if HTML5 audio play fails
          playWebAudioHeartbeat();
        });
      }
    } catch {
      playWebAudioHeartbeat();
    }
  };

  useEffect(() => {
    if (!autoPlay) return;

    // Trigger 1st subtle heartbeat sound synchronized with ECG pulse line start
    if (!soundPlayed.current) {
      soundPlayed.current = true;
      triggerAudio();
    }

    const handleUserGesture = () => {
      triggerAudio();
      window.removeEventListener("pointerdown", handleUserGesture);
      window.removeEventListener("keydown", handleUserGesture);
    };

    window.addEventListener("pointerdown", handleUserGesture);
    window.addEventListener("keydown", handleUserGesture);

    // ── Coordinated Timeline Sequence ──────────────────────────────────────────
    // 0.0s – 1.4s: Thin ECG line slowly draws across screen with heartbeat peaks
    // 1.4s – 2.2s: Line curves into waveform inside PulseIQ blue icon & settles
    const t1 = setTimeout(() => {
      setStage("icon-form");
      triggerAudio(); // 2nd subtle pulse synchronized with icon settlement
    }, 1400);

    // 2.2s – 2.9s: "PulseIQ" wordmark smoothly slides in from right & settles
    const t2 = setTimeout(() => setStage("wordmark"), 2200);

    // 2.9s – 3.3s: Subtle glow pulse & gentle outward ripple ring
    const t3 = setTimeout(() => setStage("glow-pulse"), 2900);

    // 3.3s – 4.3s: Hold complete logo on screen for 1 FULL SECOND before moving to login
    const t4 = setTimeout(() => setStage("hold-logo"), 3300);

    // 4.3s – 4.8s: Smooth seamless fade out to reveal login screen
    const t5 = setTimeout(() => setStage("fadeout"), 4300);

    // 4.8s: Complete transition and clean up audio
    const t6 = setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setStage("complete");
      onComplete?.();
    }, 4800);

    return () => {
      window.removeEventListener("pointerdown", handleUserGesture);
      window.removeEventListener("keydown", handleUserGesture);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
    };
  }, [autoPlay, onComplete]);

  if (stage === "complete") return null;

  // Subtle particles following the ECG line
  const particles = [
    { id: 1, delay: 0.15, x: -220, y: 0 },
    { id: 2, delay: 0.35, x: -120, y: -30 },
    { id: 3, delay: 0.55, x: 0, y: 40 },
    { id: 4, delay: 0.75, x: 110, y: -25 },
    { id: 5, delay: 0.95, x: 190, y: 20 },
    { id: 6, delay: 1.15, x: 270, y: 0 },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: stage === "fadeout" ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-aurora text-foreground overflow-hidden select-none pointer-events-auto"
      >
        {/* Soft White & Blue Ambient Radial Glow (Matches App Background) */}
        <div className="pointer-events-none absolute inset-0 bg-radial from-blue-400/20 via-sky-300/10 to-transparent blur-3xl dark:from-blue-600/20 dark:via-slate-900/40" />

        {/* ── Phase 1: Slow & Fluid Thin ECG Pulse Line Drawing (0.0s – 1.4s) ─── */}
        {stage === "ecg-draw" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg
              viewBox="0 0 800 200"
              className="w-[850px] h-[240px] overflow-visible drop-shadow-[0_0_15px_rgba(37,99,235,0.4)]"
            >
              <motion.path
                d="M 0 100 L 250 100 L 280 40 L 315 160 L 350 60 L 385 140 L 420 100 L 800 100"
                fill="none"
                stroke="url(#subtle-ecg-gradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.3, ease: [0.25, 0.1, 0.25, 1] }}
              />
              <defs>
                <linearGradient id="subtle-ecg-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.1" />
                  <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#60A5FA" stopOpacity="1" />
                </linearGradient>
              </defs>
            </svg>

            {/* Subtle particles floating gently along the ECG line */}
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0, x: p.x - 40, y: p.y }}
                animate={{ opacity: [0, 0.85, 0], scale: [0.5, 1.2, 0.4], x: p.x, y: p.y }}
                transition={{ duration: 1.0, delay: p.delay, ease: "easeOut" }}
                className="absolute h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"
              />
            ))}
          </div>
        )}

        {/* ── Phase 2, 3, 4: Icon Curve, Spring Settlement, Wordmark & 1s Hold ──── */}
        <div className="relative flex items-center gap-4.5 z-10">
          
          {/* Gentle Outward Ripple Ring */}
          {stage === "glow-pulse" && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0.7 }}
              animate={{ scale: 2.0, opacity: 0 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
              className="absolute -left-1 top-1/2 -translate-y-1/2 h-16 w-16 rounded-2xl border border-primary/50 shadow-[0_0_25px_rgba(37,99,235,0.4)] pointer-events-none"
            />
          )}

          {/* PulseIQ Blue Icon Badge (Gently scales & settles with soft spring) */}
          {stage !== "ecg-draw" && (
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 22 }}
              className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-blue-600 to-primary-glow text-white shadow-soft ring-1 ring-primary/30"
            >
              {/* ECG Waveform Icon inside Icon Badge with Subtle Glow Pulse */}
              <motion.div
                animate={
                  stage === "glow-pulse"
                    ? { scale: [1, 1.15, 1], filter: ["brightness(1)", "brightness(1.3)", "brightness(1)"] }
                    : { scale: 1 }
                }
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                <Activity className="h-8 w-8 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
              </motion.div>
            </motion.div>
          )}

          {/* Wordmark Text: Smoothly slides in from the right & settles */}
          {(stage === "wordmark" || stage === "glow-pulse" || stage === "hold-logo" || stage === "fadeout") && (
            <motion.div
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-4xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center"
            >
              <span>Pulse</span>
              <span className="text-primary ml-0.5">IQ</span>
            </motion.div>
          )}

        </div>
      </motion.div>
    </AnimatePresence>
  );
};
