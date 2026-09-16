require('dotenv').config();
const WebSocket = require("ws");
const https = require("https");
const http  = require("http");
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, addDoc, collection, Timestamp } = require("firebase/firestore");
const { parseAndValidateESP32Packet } = require("./sensor_parser");

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

// ─── Global State for ESP32 Bluetooth & Telemetry Modes ─────────────────────
let sensorMode = "SIMULATION"; // "SIMULATION" | "REAL_ESP32"
let esp32Status = "DISCONNECTED"; // "CONNECTED" | "DISCONNECTED" | "RECONNECTING"
let latestEsp32Data = null;
let lastEsp32RxTimestamp = 0;

// ─── HTTP Server & Direct Wi-Fi Telemetry Endpoint ──────────────────────────
const server = http.createServer((req, res) => {
  if (req.method === "GET" && (req.url === "/" || req.url === "/health" || req.url === "/api/health" || req.url === "/api/status")) {
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify({
      status: "online",
      service: "PulseIQ Backend Server",
      port: 5000,
      sensorMode: sensorMode,
      esp32Status: esp32Status,
      websocket: "ws://localhost:5000",
      endpoints: {
        telemetry: "POST /api/v1/telemetry",
        health: "GET /health"
      }
    }, null, 2));
  } else if (req.method === "POST" && (req.url === "/api/v1/telemetry" || req.url === "/api/telemetry")) {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        const packetData = payload.data || payload;
        const result = parseAndValidateESP32Packet(packetData);

        if (result.valid) {
          latestEsp32Data = result.data;
          lastEsp32RxTimestamp = Date.now();
          esp32Status = "CONNECTED";
          sensorMode = "REAL_ESP32";
          console.log(`[ESP32 Wi-Fi Telemetry RX] Temp: ${result.data.temperature}°C | GSR: ${result.data.gsr} | HR: ${result.data.heartRate} BPM | State: ${result.data.state}`);
          res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
          res.end(JSON.stringify({ status: "success", receivedAt: new Date().toISOString() }));
        } else {
          console.warn(`[ESP32 Wi-Fi Telemetry WARNING] Invalid packet: ${result.reason}`);
          res.writeHead(400, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
          res.end(JSON.stringify({ status: "error", reason: result.reason }));
        }
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ status: "error", message: err.message }));
      }
    });
  } else if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  }
});

const wss = new WebSocket.Server({ server });

server.listen(5000, () => {
  console.log("HTTP & WebSocket Backend running on http://localhost:5000 (Wi-Fi REST) and ws://localhost:5000 (WS)");
});

// ─── Call Python ML service for a prediction ────────────────────────────────
async function mlPredict(userId, phase, hour, age, gender) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ phase, hour, age, gender });
    const req  = http.request({
      hostname: "127.0.0.1",
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

// ─── AI Health Score Engine ──────────────────────────────────────────────────
const HEALTH_SCORE_WEIGHTS = {
  glucoseTrend: 0.30,
  heartRate: 0.15,
  stressLevel: 0.15,
  temperature: 0.10,
  spo2: 0.10,
  activity: 0.10,
  confidence: 0.10
};

function calculateHealthScore({ trend, glucose, heartRate, stress, temperature, spo2, activity, confidence }) {
  let score = 0;

  // 1. Glucose Trend (30%)
  let trendPts = 0;
  if (trend === "stable") {
    trendPts = HEALTH_SCORE_WEIGHTS.glucoseTrend * 100;
  } else {
    if (glucose >= 70 && glucose <= 140) {
      trendPts = (HEALTH_SCORE_WEIGHTS.glucoseTrend * 100) * 0.67; // ~20 points
    } else {
      trendPts = (HEALTH_SCORE_WEIGHTS.glucoseTrend * 100) * 0.33; // ~10 points
    }
  }
  score += trendPts;

  // 2. Heart Rate (15%)
  let hrPts = 0;
  if (heartRate >= 60 && heartRate <= 90) {
    hrPts = HEALTH_SCORE_WEIGHTS.heartRate * 100;
  } else if (heartRate >= 50 && heartRate <= 110) {
    hrPts = (HEALTH_SCORE_WEIGHTS.heartRate * 100) * 0.60;
  } else {
    hrPts = (HEALTH_SCORE_WEIGHTS.heartRate * 100) * 0.20;
  }
  score += hrPts;

  // 3. Stress Level (15%)
  let stressPts = 0;
  if (stress === "low") {
    stressPts = HEALTH_SCORE_WEIGHTS.stressLevel * 100;
  } else if (stress === "moderate") {
    stressPts = (HEALTH_SCORE_WEIGHTS.stressLevel * 100) * 0.60;
  } else {
    stressPts = (HEALTH_SCORE_WEIGHTS.stressLevel * 100) * 0.20;
  }
  score += stressPts;

  // 4. Body Temperature (10%)
  let tempPts = 0;
  if (temperature >= 36.2 && temperature <= 37.2) {
    tempPts = HEALTH_SCORE_WEIGHTS.temperature * 100;
  } else if (temperature >= 35.5 && temperature <= 38.0) {
    tempPts = (HEALTH_SCORE_WEIGHTS.temperature * 100) * 0.60;
  } else {
    tempPts = (HEALTH_SCORE_WEIGHTS.temperature * 100) * 0.20;
  }
  score += tempPts;

  // 5. SpO2 (10%)
  let spo2Pts = 0;
  if (spo2 >= 96) {
    spo2Pts = HEALTH_SCORE_WEIGHTS.spo2 * 100;
  } else if (spo2 >= 90) {
    spo2Pts = (HEALTH_SCORE_WEIGHTS.spo2 * 100) * 0.50;
  } else {
    spo2Pts = (HEALTH_SCORE_WEIGHTS.spo2 * 100) * 0.10;
  }
  score += spo2Pts;

  // 6. Activity (10%)
  let actPts = 0;
  if (activity === "walking" || activity === "running") {
    actPts = HEALTH_SCORE_WEIGHTS.activity * 100;
  } else if (activity === "sitting" || activity === "sleeping") {
    actPts = (HEALTH_SCORE_WEIGHTS.activity * 100) * 0.80;
  } else {
    actPts = (HEALTH_SCORE_WEIGHTS.activity * 100) * 0.40;
  }
  score += actPts;

  // 7. Prediction Confidence (10%)
  let confPts = (confidence / 100) * (HEALTH_SCORE_WEIGHTS.confidence * 100);
  score += confPts;

  return Math.round(score);
}

function getHealthInsights(score, { trend, glucose, heartRate, stress, temperature, spo2 }) {
  const reasons = [];
  const recs = [];

  if (glucose > 140) {
    reasons.push("Elevated glucose levels");
    recs.push("Monitor your glucose trend and drink plenty of water.");
  } else if (glucose < 70) {
    reasons.push("Low glucose levels");
    recs.push("Consume a small fast-acting carbohydrate snack (e.g. juice, candy).");
  }

  if (trend !== "stable" && (glucose > 140 || glucose < 70)) {
    reasons.push(`${trend.charAt(0).toUpperCase() + trend.slice(1)} glucose trend`);
  }

  if (heartRate > 90) {
    reasons.push("Elevated heart rate");
    recs.push("Take a brief rest and practice calm, deep breathing.");
  } else if (heartRate < 60 && heartRate > 0) {
    reasons.push("Low heart rate");
  }

  if (stress === "high") {
    reasons.push("High stress level");
    recs.push("Perform a short mindfulness or breathing exercise to relax.");
  } else if (stress === "moderate") {
    reasons.push("Moderate stress level");
  }

  if (temperature > 37.2) {
    reasons.push("Slightly elevated body temperature");
    recs.push("Ensure you are in a cool environment and stay hydrated.");
  } else if (temperature < 36.2) {
    reasons.push("Cool body temperature");
  }

  if (spo2 < 95) {
    reasons.push("Low oxygen saturation (SpO₂)");
    recs.push("Ensure proper ventilation and check your device placement.");
  }

  // Fallbacks if score is low but no specific reasons triggered
  if (score < 90 && reasons.length === 0) {
    reasons.push("Minor physiological variations");
  }
  if (score < 90 && recs.length === 0) {
    recs.push("Maintain a steady diet and routine.");
    recs.push("Ensure regular physical activity throughout the day.");
  }

  // Categories
  let category = "Excellent";
  if (score >= 75 && score < 90) category = "Good";
  else if (score >= 60 && score < 75) category = "Moderate";
  else if (score >= 40 && score < 60) category = "Needs Attention";
  else if (score < 40) category = "High Risk";

  return {
    category,
    explanation: reasons.length > 0 ? reasons.join(", ") : "All physiological systems are operating within optimal limits.",
    recommendations: recs.length > 0 ? recs : ["Keep up the great work!", "Stay active and well hydrated."]
  };
}

// ─── Periodic snapshot writer (every 30 min) ──────────────────────────────────
const recentReadings = [];
const recentHealthScores = [];
setInterval(async () => {
  if (recentReadings.length === 0) return;
  const avg = Math.round(recentReadings.reduce((a, b) => a + b, 0) / recentReadings.length);
  const max = Math.max(...recentReadings);
  const min = Math.min(...recentReadings);
  const spikes = recentReadings.filter(v => v > 160).length;

  const avgHealth = recentHealthScores.length > 0
    ? Math.round(recentHealthScores.reduce((a, b) => a + b, 0) / recentHealthScores.length)
    : 95;

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
      avg_health_score: avgHealth,
      summary: `Avg Glucose: ${avg} mg/dL | Avg Health Score: ${avgHealth}%`,
      created_at: Timestamp.now()
    });
    console.log("Backend -> Firebase: [history_snapshots] 30-min snapshot saved.");
    recentReadings.length = 0; // reset buffer
    recentHealthScores.length = 0;
  } catch (e) {
    console.error("history_snapshots write error:", e.message);
  }
}, 30 * 60 * 1000);

// ─── Main WebSocket connection handler ────────────────────────────────────────
wss.on("connection", (ws) => {
  console.log("[WebSocket] Client connected");

  // Send current mode & status upon initial connection
  ws.send(JSON.stringify({
    type: "system_state",
    mode: sensorMode,
    esp32Status: esp32Status,
    esp32Data: latestEsp32Data
  }));

  // Handle incoming messages from Bluetooth receiver or React frontend
  ws.on("message", (message) => {
    try {
      const parsedMsg = JSON.parse(message);

      if (parsedMsg.type === "esp32_sensor_data") {
        const result = parseAndValidateESP32Packet(parsedMsg.data);
        if (result.valid) {
          latestEsp32Data = result.data;
          lastEsp32RxTimestamp = Date.now();
          esp32Status = "CONNECTED";
          sensorMode = "REAL_ESP32";
          console.log(`[ESP32 Telemetry RX] Temp: ${result.data.temperature}°C | GSR: ${result.data.gsr} | HR: ${result.data.heartRate} BPM | State: ${result.data.state}`);
        } else {
          console.warn(`[ESP32 Telemetry WARNING] Invalid packet rejected: ${result.reason}`);
        }
      } else if (parsedMsg.type === "esp32_status") {
        if (parsedMsg.status) {
          esp32Status = parsedMsg.status;
          console.log(`[ESP32 Status Update] ESP32 status changed to: ${esp32Status}`);
        }
      } else if (parsedMsg.type === "set_mode") {
        if (parsedMsg.mode === "SIMULATION" || parsedMsg.mode === "REAL_ESP32") {
          sensorMode = parsedMsg.mode;
          console.log(`[Mode Selector] Sensor mode changed to: ${sensorMode}`);
        }
      }
    } catch (err) {
      console.error("[WebSocket] Failed to process incoming message:", err.message);
    }
  });

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

    // Check stale ESP32 connection in real mode
    if (sensorMode === "REAL_ESP32") {
      if (Date.now() - lastEsp32RxTimestamp > 6000) {
        if (esp32Status === "CONNECTED") {
          esp32Status = "RECONNECTING";
          console.log("[ESP32 Telemetry WARNING] No data received for >6s. Status changed to RECONNECTING.");
        }
      }
    }

    // ── 1. Determine Vitals (Real ESP32 vs Simulation) ────────────────────────
    let heartRate = 75;
    let temperature = 36.6;
    let stress = "low";
    let spo2 = 98;
    let activity = "sitting";

    if (sensorMode === "REAL_ESP32" && latestEsp32Data) {
      heartRate = latestEsp32Data.heartRate;
      temperature = latestEsp32Data.temperature;
      activity = latestEsp32Data.derivedActivity;
      // Map hardware state & GSR readings to physiological stress
      if (latestEsp32Data.state === "STRESSED") {
        stress = "high";
      } else if (latestEsp32Data.state === "NO CONTACT") {
        stress = "moderate";
      } else {
        stress = latestEsp32Data.gsr > 2000 ? "high" : latestEsp32Data.gsr > 800 ? "moderate" : "low";
      }
    } else {
      // Simulation mode vitals generator
      const activities = ["sitting", "walking", "running", "sleeping", "inactive"];
      activity = activities[Math.floor(Math.random() * activities.length)];

      if (activity === "running") {
        heartRate = Math.floor(100 + Math.random() * 40);
        temperature = Math.round((37.0 + Math.random() * 0.8) * 10) / 10;
        stress = Math.random() > 0.5 ? "moderate" : "low";
        spo2 = Math.floor(96 + Math.random() * 4);
      } else if (activity === "walking") {
        heartRate = Math.floor(80 + Math.random() * 20);
        temperature = Math.round((36.5 + Math.random() * 0.7) * 10) / 10;
        stress = "low";
        spo2 = Math.floor(97 + Math.random() * 4);
      } else if (activity === "sleeping") {
        heartRate = Math.floor(55 + Math.random() * 10);
        temperature = Math.round((36.0 + Math.random() * 0.6) * 10) / 10;
        stress = "low";
        spo2 = Math.floor(95 + Math.random() * 4);
      } else { // inactive / sitting
        heartRate = Math.floor(65 + Math.random() * 20);
        temperature = Math.round((36.2 + Math.random() * 0.6) * 10) / 10;
        stress = glucose > 150 ? "high" : (glucose > 120 || Math.random() > 0.8) ? "moderate" : "low";
        spo2 = Math.floor(97 + Math.random() * 4);
      }
    }

    // ── 2. Calculate AI Health Score ─────────────────────────────────────────
    const healthScore = calculateHealthScore({
      trend,
      glucose,
      heartRate,
      stress,
      temperature,
      spo2,
      activity,
      confidence
    });
    recentHealthScores.push(healthScore);

    const { category: healthCategory, explanation: healthExplanation, recommendations: healthRecommendations } =
      getHealthInsights(healthScore, { trend, glucose, heartRate, stress, temperature, spo2 });

    // ── 3. WebSocket push to frontend ────────────────────────────────────────
    const wsPayload = {
      type: "telemetry_update",
      mode: sensorMode,
      esp32Status: esp32Status,
      esp32Data: latestEsp32Data,
      glucose: [
        { time: "Now",    value: glucose },
        { time: "Prev",   value: glucose - 5 },
        { time: "Before", value: glucose - 10 },
      ],
      risk: risk.charAt(0).toUpperCase() + risk.slice(1),
      heartRate,
      temperature,
      stress,
      spo2,
      activity,
      healthScore,
      healthCategory,
      healthExplanation,
      healthRecommendations
    };
    ws.send(JSON.stringify(wsPayload));

    try {
      // ── 4. predictions ──────────────────────────────────────────────────────
      await setDoc(doc(db, "predictions", "live_demo"), {
        prediction_id: "live_demo",
        user_id: "demo_user",
        model_id: "model_01",
        predicted_at: now,
        predicted_glucose: glucose,
        predicted_trend: trend,
        predicted_risk: risk,
        forecast_window_min: 5,
        confidence_score: confidence,
        // New health score metrics:
        heart_rate: heartRate,
        temperature,
        stress_level: stress,
        spo2,
        activity_status: activity,
        health_score: healthScore,
        health_category: healthCategory,
        health_explanation: healthExplanation,
        health_recommendations: healthRecommendations
      });
      console.log(`Backend -> Firebase: [predictions] glucose=${glucose} risk=${risk} health_score=${healthScore}`);

      // ── 5. dashboard_state — fast snapshot for UI cold-load ─────────────────
      await setDoc(doc(db, "dashboard_state", "dash_demo"), {
        dashboard_state_id: "dash_demo",
        user_id: "demo_user",
        current_glucose: glucose,
        current_trend: trend,
        current_risk: risk,
        model_confidence: confidence,
        last_prediction_at: now,
        updated_at: now,
        // New health score metrics:
        heart_rate: heartRate,
        temperature,
        stress_level: stress,
        spo2,
        activity_status: activity,
        health_score: healthScore,
        health_category: healthCategory,
        health_explanation: healthExplanation,
        health_recommendations: healthRecommendations
      });
      console.log("Backend -> Firebase: [dashboard_state] updated with health score.");

      // ── 6. alerts — only fire when risk is NOT normal ────────────────────────
      if (risk !== "normal") {
        await addDoc(collection(db, "alerts"), {
          user_id: "demo_user",
          prediction_id: "live_demo",
          severity: risk === "high" ? "warning" : "critical",
          category: "glucose",
          title: risk === "high" ? "Elevated Glucose Detected" : "Low Glucose Detected",
          message: `Predicted glucose: ${glucose} mg/dL — trend is ${trend}. Health Score: ${healthScore}%.`,
          acknowledged: false,
          created_at: now
        });
        console.log(`Backend -> Firebase: [alerts] FIRED — ${risk.toUpperCase()} alert.`);
      }

      // ── 7. model_comparisons — compare predicted vs observed trend ───────────
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
  }, 1000);

  ws.on("close", () => clearInterval(interval));
});

