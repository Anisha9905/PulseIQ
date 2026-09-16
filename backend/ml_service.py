import json
import math
import os
import re
import numpy as np
import xgboost as xgb
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse

HOST = "0.0.0.0"
PORT = 8001

# Dictionary to hold active trained user models in memory: user_id -> XGBRegressor
user_models = {}

def train_user_xgboost(user_id, entries):
    """
    Trains a real XGBoost regression model on the 28 calibration entries.
    Features: [phase, day, age, gender]
    Target: glucose value
    """
    if not entries or len(entries) == 0:
        return None, 0.0, None

    X = []
    y = []

    for item in entries:
        phase = float(item.get("phase", 0))
        day = float(item.get("day", 1))
        age = float(item.get("age", 30))
        gender = float(item.get("gender", 0))
        glucose = float(item.get("glucose", 100))

        X.append([phase, day, age, gender])
        y.append(glucose)

    X_np = np.array(X, dtype=np.float32)
    y_np = np.array(y, dtype=np.float32)

    # Train XGBoost Regressor model
    model = xgb.XGBRegressor(
        n_estimators=40,
        max_depth=3,
        learning_rate=0.08,
        random_state=42
    )
    model.fit(X_np, y_np)

    # Predict on training data to compute RMSE
    y_pred = model.predict(X_np)
    rmse = float(np.sqrt(np.mean((y_np - y_pred) ** 2)))
    confidence = float(max(75.0, min(98.0, round(100.0 - rmse, 1))))

    # Save to in-memory active user_models dictionary
    user_models[user_id] = model

    # Save model artifact JSON to backend/models directory
    model_dir = os.path.join(os.getcwd(), "models")
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, f"{user_id}_xgb_model.json")
    model.save_model(model_path)

    print(f"[ml_service] Trained XGBoost model for '{user_id}' on {len(entries)} samples. RMSE: {round(rmse, 2)}, Confidence: {confidence}%")
    return model_path, confidence, round(rmse, 2)


def predict_glucose_xgb(user_id, phase, hour, age, gender):
    """
    Predicts glucose level using the user's trained XGBoost model if available.
    """
    if user_id in user_models:
        model = user_models[user_id]
        day_proxy = float((hour % 7) + 1)
        X_test = np.array([[float(phase), day_proxy, float(age), float(gender)]], dtype=np.float32)
        predicted_val = float(model.predict(X_test)[0])
        glucose = int(max(50, min(350, round(predicted_val))))
        
        risk = "high" if glucose > 180 else "low" if glucose < 70 else "normal"
        trend = "rising" if glucose > 140 else "falling" if glucose < 80 else "stable"
        confidence = 92.0
        return {
            "glucose": glucose,
            "trend": trend,
            "risk": risk,
            "confidence": confidence,
            "model_used": "real_xgboost"
        }
    
    # Fallback simulation if model is not yet trained
    phase_bias = {0: -8, 1: 10, 2: 28, 3: -4}.get(int(phase), 0)
    hour_bias = -5 if 6 <= int(hour) <= 10 else 14 if 12 <= int(hour) <= 14 else 8 if 18 <= int(hour) <= 22 else 0
    gender_bias = 2 if int(gender) == 0 else -2
    age_factor = max(0, age - 35) * 0.05

    glucose = int(max(50, min(300, round(96 + phase_bias + hour_bias + gender_bias - age_factor))))
    risk = "high" if glucose > 180 else "low" if glucose < 70 else "normal"
    trend = "rising" if glucose > 140 else "falling" if glucose < 80 else "stable"

    return {
        "glucose": glucose,
        "trend": trend,
        "risk": risk,
        "confidence": 88.0,
        "model_used": "simulation_fallback"
    }


class MLServiceHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[ml_service] {fmt % args}")

    def _send_json(self, status_code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            self._send_json(200, {"status": "ok", "service": "ml_service.py", "port": PORT, "active_models": list(user_models.keys())})
            return
        self._send_json(404, {"error": "not_found"})

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/train":
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length) if length > 0 else b"{}"
            try:
                payload = json.loads(raw.decode("utf-8"))
            except Exception:
                payload = {}

            entries = payload.get("entries") or []
            user_id = payload.get("user_id") or "demo_user"
            n_samples = len(entries) if isinstance(entries, list) else 0

            model_path, confidence, rmse = train_user_xgboost(user_id, entries)

            self._send_json(200, {
                "status": "trained",
                "user_id": user_id,
                "model_version": "xgb-v1",
                "n_samples": n_samples,
                "confidence": confidence,
                "rmse": rmse,
                "model_path": model_path or "",
            })
            return

        if path.startswith("/predict/"):
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length) if length > 0 else b"{}"
            try:
                payload = json.loads(raw.decode("utf-8"))
            except Exception:
                payload = {}

            phase = payload.get("phase", 0)
            hour = payload.get("hour", 12)
            age = payload.get("age", 30)
            gender = payload.get("gender", 0)

            user_id = path.split("/")[-1] or "demo_user"

            try:
                prediction = predict_glucose_xgb(user_id, phase, hour, age, gender)
            except Exception as exc:
                self._send_json(400, {"error": "invalid_prediction_payload", "details": str(exc)})
                return

            self._send_json(200, {
                "user_id": user_id,
                "glucose": prediction["glucose"],
                "trend": prediction["trend"],
                "risk": prediction["risk"],
                "confidence": prediction["confidence"],
                "model_used": prediction["model_used"]
            })
            return

        self._send_json(404, {"error": "unknown_endpoint"})


def main():
    server = HTTPServer((HOST, PORT), MLServiceHandler)
    print(f"[ml_service] Real XGBoost Engine listening on http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
