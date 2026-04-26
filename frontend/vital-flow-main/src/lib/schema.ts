import { Timestamp } from "firebase/firestore";

export interface User {
  user_id: string;
  email: string;
  phone: string;
  created_at: Timestamp;
  last_login_at: Timestamp;
  auth_provider: string;
}

export interface Profile {
  profile_id: string;
  user_id: string;
  full_name: string;
  age: number;
  gender: string;
  dob: string;
  profile_image_url: string;
  avatar_type: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface UserPreferences {
  preference_id: string;
  user_id: string;
  theme: string;
  notification_enabled: boolean;
  reminder_enabled: boolean;
  language: string;
  updated_at: Timestamp;
}

export interface HistoricalGlucoseEntry {
  entry_id: string;
  user_id: string;
  recorded_at: Timestamp;
  glucose_value: number;
  state: "fasting" | "before_meal" | "after_meal" | "post_activity";
  meal_type?: string;
  activity_type?: string;
  notes?: string;
  created_at: Timestamp;
}

export interface MLModel {
  model_id: string;
  user_id: string;
  model_version: string;
  status: "training" | "active" | "archived";
  training_start: Timestamp;
  training_end?: Timestamp;
  accuracy_score?: number;
  confidence_score?: number;
  artifact_url?: string;
  created_at: Timestamp;
}

export interface ModelTrainingData {
  training_data_id: string;
  user_id: string;
  model_id: string;
  historical_entry_id: string;
  feature_vector: number[];
  target_glucose: number;
  context_label: string;
  created_at: Timestamp;
}

export interface Prediction {
  prediction_id: string;
  user_id: string;
  model_id: string;
  predicted_at: Timestamp;
  predicted_glucose: number;
  predicted_trend: "rising" | "stable" | "falling";
  predicted_risk: "low" | "normal" | "high";
  forecast_window_min: number;
  confidence_score: number;
}

export interface ModelComparison {
  comparison_id: string;
  user_id: string;
  prediction_id: string;
  expected_state: string;
  observed_state: string;
  deviation_score: number;
  anomaly_flag: boolean;
  comparison_result: "normal" | "mismatch" | "anomaly";
  created_at: Timestamp;
}

export interface Alert {
  alert_id: string;
  user_id: string;
  prediction_id: string;
  severity: "info" | "warning" | "critical";
  category: "glucose" | "prediction" | "calibration";
  title: string;
  message: string;
  acknowledged: boolean;
  created_at: Timestamp;
}

export interface AIInsight {
  insight_id: string;
  user_id: string;
  generated_at: Timestamp;
  insight_type: "pattern" | "anomaly" | "recommendation";
  title: string;
  content: string;
  confidence_score: number;
}

export interface DashboardState {
  dashboard_state_id: string;
  user_id: string;
  current_glucose: number;
  current_trend: string;
  current_risk: string;
  model_confidence: number;
  last_prediction_at: Timestamp;
  updated_at: Timestamp;
}

export interface DeviceStatus {
  device_status_id: string;
  user_id: string;
  device_name: string;
  connection_status: "connected" | "disconnected";
  wear_status: "worn" | "removed";
  battery_level: number;
  signal_strength: number;
  updated_at: Timestamp;
}

export interface HistorySnapshot {
  snapshot_id: string;
  user_id: string;
  snapshot_type: "daily" | "weekly";
  start_date: Timestamp;
  end_date: Timestamp;
  avg_glucose: number;
  max_glucose: number;
  min_glucose: number;
  spike_count: number;
  summary: string;
  created_at: Timestamp;
}

export interface CalibrationProgress {
  calibration_id: string;
  user_id: string;
  total_required_entries: number;
  completed_entries: number;
  progress_percent: number;
  status: "pending" | "in_progress" | "completed";
  started_at: Timestamp;
  completed_at?: Timestamp;
}
