require('dotenv').config();
const WebSocket = require("ws");
const https = require("https");
const http  = require("http");
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, addDoc, collection, Timestamp } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const wss = new WebSocket.Server({ port: 5000 });
console.log("WebSocket & Firebase Backend running on ws://localhost:5000");

// ─── Call Python ML service for a prediction ────────────────────────────────
async function mlPredict(userId, phase, hour, age, gender) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ phase, hour, age, gender });
    const req  = http.request({
      hostname: "localhost",
      port: 8001,
      path: `/predict/${userId}`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    }, (res) => {
      let data = "";
      res.on("data", (c) => data += c);
      res.on("end",  () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on("error", () => resolve(null)); // ML service not running — fall back gracefully
    req.write(body);
    req.end();
  });
}

// ─── Helper: derive trend from last two readings ──────────────────────────────
let lastGlucoseValue = 105;
function getTrend(current) {
  const diff = current - lastGlucoseValue;
  if (diff > 3) return "rising";
  if (diff < -3) return "falling";
  return "stable";
}

// ─── Periodic snapshot writer (every 30 min) ──────────────────────────────────
const recentReadings = [];
setInterval(async () => {
  if (recentReadings.length === 0) return;
  const avg = Math.round(recentReadings.reduce((a, b) => a + b, 0) / recentReadings.length);
  const max = Math.max(...recentReadings);
  const min = Math.min(...recentReadings);
  const spikes = recentReadings.filter(v => v > 160).length;
  try {
    await addDoc(collection(db, "history_snapshots"), {
      user_id: "demo_user",
      snapshot_type: "daily",
      start_date: Timestamp.fromMillis(Date.now() - 30 * 60 * 1000),
      end_date: Timestamp.now(),
      avg_glucose: avg,
      max_glucose: max,
      min_glucose: min,
      spike_count: spikes,
      summary: `Avg: ${avg} | Max: ${max} | Min: ${min} | Spikes: ${spikes}`,
      created_at: Timestamp.now()
    });
    console.log("Backend -> Firebase: [history_snapshots] 30-min snapshot saved.");
    recentReadings.length = 0; // reset buffer
  } catch (e) {
    console.error("history_snapshots write error:", e.message);
  }
}, 30 * 60 * 1000);

// ─── Main WebSocket connection handler ────────────────────────────────────────
wss.on("connection", (ws) => {
  console.log("Client connected");

  // Update device_status to connected when a client joins
  setDoc(doc(db, "device_status", "dev_demo"), {
    device_status_id: "dev_demo",
    user_id: "demo_user",
    device_name: "PulseIQ Band (Simulated)",
    connection_status: "connected",
    wear_status: "worn",
    battery_level: 92,
    signal_strength: 88,
    updated_at: Timestamp.now()
  }).then(() => console.log("Backend -> Firebase: [device_status] connected."));

  ws.on("close", () => {
    // Update device_status to disconnected when client leaves
    setDoc(doc(db, "device_status", "dev_demo"), {
      connection_status: "disconnected",
      wear_status: "removed",
      updated_at: Timestamp.now()
    }, { merge: true })
    .then(() => console.log("Backend -> Firebase: [device_status] disconnected."));
  });

  const interval = setInterval(async () => {
    const now  = Timestamp.now();
    const hour = new Date().getHours();
    // Determine phase from time of day
    const phase = hour < 9 ? 0 : hour < 13 ? 1 : hour < 16 ? 2 : 3;

    // ── Try XGBoost prediction first, fall back to simulation ────────────────
    const mlResult = await mlPredict("demo_user", phase, hour, 30, 0);
    let glucose, trend, risk, confidence;

    if (mlResult && mlResult.glucose) {
      // Real XGBoost prediction
      glucose    = Math.round(mlResult.glucose);
      trend      = mlResult.trend;
      risk       = mlResult.risk;
      confidence = mlResult.confidence;
      console.log(`[ML] XGBoost prediction: ${glucose} mg/dL | ${trend} | ${risk}`);
    } else {
      // Fallback simulation (ML service not running)
      glucose    = Math.floor(80 + Math.random() * 80);
      trend      = getTrend(glucose);
      risk       = glucose > 160 ? "high" : glucose < 90 ? "low" : "normal";
      confidence = Math.round(80 + Math.random() * 15);
    }

    // Capture deviation BEFORE overwriting lastGlucoseValue
    const deviation = Math.abs(glucose - lastGlucoseValue);
    const isAnomaly = deviation > 30;

    // Track for snapshot + update rolling value
    recentReadings.push(glucose);
    lastGlucoseValue = glucose;

    // ── 1. WebSocket push to frontend ────────────────────────────────────────
    const wsPayload = {
      glucose: [
        { time: "Now",    value: glucose },
        { time: "Prev",   value: glucose - 5 },
        { time: "Before", value: glucose - 10 },
      ],
      risk: risk.charAt(0).toUpperCase() + risk.slice(1),
    };
    ws.send(JSON.stringify(wsPayload));

    try {
      // ── 2. predictions ──────────────────────────────────────────────────────
      await setDoc(doc(db, "predictions", "live_demo"), {
        prediction_id: "live_demo",
        user_id: "demo_user",
        model_id: "model_01",
        predicted_at: now,
        predicted_glucose: glucose,
        predicted_trend: trend,
        predicted_risk: risk,
        forecast_window_min: 5,
        confidence_score: confidence
      });
      console.log(`Backend -> Firebase: [predictions] glucose=${glucose} risk=${risk} trend=${trend}`);

      // ── 3. dashboard_state — fast snapshot for UI cold-load ─────────────────
      await setDoc(doc(db, "dashboard_state", "dash_demo"), {
        dashboard_state_id: "dash_demo",
        user_id: "demo_user",
        current_glucose: glucose,
        current_trend: trend,
        current_risk: risk,
        model_confidence: confidence,
        last_prediction_at: now,
        updated_at: now
      });
      console.log("Backend -> Firebase: [dashboard_state] updated.");

      // ── 4. alerts — only fire when risk is NOT normal ────────────────────────
      if (risk !== "normal") {
        await addDoc(collection(db, "alerts"), {
          user_id: "demo_user",
          prediction_id: "live_demo",
          severity: risk === "high" ? "warning" : "critical",
          category: "glucose",
          title: risk === "high" ? "Elevated Glucose Detected" : "Low Glucose Detected",
          message: `Predicted glucose: ${glucose} mg/dL — trend is ${trend}.`,
          acknowledged: false,
          created_at: now
        });
        console.log(`Backend -> Firebase: [alerts] FIRED — ${risk.toUpperCase()} alert.`);
      }

      // ── 5. model_comparisons — compare predicted vs observed trend ───────────
      const deviation = Math.abs(glucose - lastGlucoseValue);
      const isAnomaly = deviation > 30;
      await addDoc(collection(db, "model_comparisons"), {
        user_id: "demo_user",
        prediction_id: "live_demo",
        expected_state: trend,
        observed_state: risk,
        deviation_score: deviation,
        anomaly_flag: isAnomaly,
        comparison_result: isAnomaly ? "anomaly" : deviation > 10 ? "mismatch" : "normal",
        created_at: now
      });
      console.log(`Backend -> Firebase: [model_comparisons] deviation=${deviation} anomaly=${isAnomaly}`);

    } catch (e) {
      console.error("Backend Firebase sync error:", e.message);
    }
  }, 5000);

  ws.on("close", () => clearInterval(interval));
});
