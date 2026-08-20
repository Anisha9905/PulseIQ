import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, Timestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB6LwAvCzrDnr6Jb2eBieU3gppN1bhAnjQ",
  authDomain: "pulseiq-b946b.firebaseapp.com",
  projectId: "pulseiq-b946b",
  storageBucket: "pulseiq-b946b.firebasestorage.app",
  messagingSenderId: "165129390133",
  appId: "1:165129390133:web:241758924ac91cbc76497c",
  measurementId: "G-SJ8GXLGQ2C"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function init() {
  console.log("Initializing all 14 Firebase Collections...");
  const dummyUserId = "system_init";
  const now = Timestamp.now();

  try {
    await setDoc(doc(db, "users", dummyUserId), { user_id: dummyUserId, email: "init@pulseiq.dev", phone: "000", created_at: now, last_login_at: now, auth_provider: "system" });
    await setDoc(doc(db, "profiles", dummyUserId), { profile_id: dummyUserId, user_id: dummyUserId, full_name: "Init", age: 0, gender: "system", dob: "00/00/0000", profile_image_url: "", avatar_type: "-", created_at: now, updated_at: now });
    await setDoc(doc(db, "user_preferences", dummyUserId), { preference_id: "pref_01", user_id: dummyUserId, theme: "light", notification_enabled: true, reminder_enabled: true, language: "en", updated_at: now });
    await setDoc(doc(db, "historical_glucose_entries", "entry_01"), { entry_id: "entry_01", user_id: dummyUserId, recorded_at: now, glucose_value: 100, state: "fasting", created_at: now });
    await setDoc(doc(db, "ml_models", "model_01"), { model_id: "model_01", user_id: dummyUserId, model_version: "v1", status: "active", training_start: now, created_at: now });
    await setDoc(doc(db, "model_training_data", "train_01"), { training_data_id: "train_01", user_id: dummyUserId, model_id: "model_01", historical_entry_id: "entry_01", feature_vector: [0], target_glucose: 100, context_label: "base", created_at: now });
    await setDoc(doc(db, "predictions", "pred_01"), { prediction_id: "pred_01", user_id: dummyUserId, model_id: "model_01", predicted_at: now, predicted_glucose: 100, predicted_trend: "stable", predicted_risk: "normal", forecast_window_min: 5, confidence_score: 99 });
    await setDoc(doc(db, "model_comparisons", "comp_01"), { comparison_id: "comp_01", user_id: dummyUserId, prediction_id: "pred_01", expected_state: "n/a", observed_state: "n/a", deviation_score: 0, anomaly_flag: false, comparison_result: "normal", created_at: now });
    await setDoc(doc(db, "alerts", "alert_01"), { alert_id: "alert_01", user_id: dummyUserId, prediction_id: "pred_01", severity: "info", category: "glucose", title: "Init", message: "Init successful", acknowledged: true, created_at: now });
    await setDoc(doc(db, "ai_insights", "insight_01"), { insight_id: "insight_01", user_id: dummyUserId, generated_at: now, insight_type: "pattern", title: "Init", content: "Init", confidence_score: 100 });
    await setDoc(doc(db, "dashboard_state", "dash_01"), { dashboard_state_id: "dash_01", user_id: dummyUserId, current_glucose: 100, current_trend: "stable", current_risk: "normal", model_confidence: 100, last_prediction_at: now, updated_at: now });
    await setDoc(doc(db, "device_status", "dev_01"), { device_status_id: "dev_01", user_id: dummyUserId, device_name: "PulseIQ Band", connection_status: "connected", wear_status: "worn", battery_level: 100, signal_strength: 100, updated_at: now });
    await setDoc(doc(db, "history_snapshots", "snap_01"), { snapshot_id: "snap_01", user_id: dummyUserId, snapshot_type: "daily", start_date: now, end_date: now, avg_glucose: 100, max_glucose: 100, min_glucose: 100, spike_count: 0, summary: "Initialization snapshot", created_at: now });
    await setDoc(doc(db, "calibration_progress", "calib_01"), { calibration_id: "calib_01", user_id: dummyUserId, total_required_entries: 1, completed_entries: 1, progress_percent: 100, status: "completed", started_at: now });
    
    console.log("SUCCESS! All 14 Collections injected into Firebase.");
    process.exit(0);
  } catch (e) {
    console.error("FAIL", e);
    process.exit(1);
  }
}

init();
