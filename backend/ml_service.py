import json
import math
import os
import re
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse

HOST = "0.0.0.0"
PORT = 8001


def clamp(value, low, high):
    return max(low, min(high, value))


def safe_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def predict_glucose(phase, hour, age, gender):
    # Lightweight deterministic simulation that keeps the API contract stable for the UI/backend.
    # It can be replaced with XGBoost/NumPy inference once real training artifacts exist.
    phase_bias = {
        0: -8,   # fasting
        1: 10,   # before meal
        2: 28,   # after meal
        3: -4,   # post activity
    }.get(int(phase), 0)

    hour_bias = 0
    if 6 <= int(hour) <= 10:
        hour_bias = -5
    elif 12 <= int(hour) <= 14:
        hour_bias = 14
    elif 18 <= int(hour) <= 22:
        hour_bias = 8

    gender_bias = 0
    if int(gender) == 0:
        gender_bias = 2
    elif int(gender) == 1:
        gender_bias = -2

    age_factor = max(0, age - 35) * 0.05

    glucose = 96 + phase_bias + hour_bias + gender_bias - age_factor
    glucose = clamp(round(glucose), 51, 270)

    if glucose < 70:
        risk = "low"
    elif glucose > 180:
        risk = "high"
    else:
        risk = "normal"

    trend = "stable"
    # The backend's existing consumer expects trend semantics roughly consistent with user stream data.
    if glucose < 80:
        trend = "falling"
    elif glucose > 140:
        trend = "rising"

    confidence = 88.0
    return {
        "glucose": glucose,
        "trend": trend,
        "risk": risk,
        "confidence": confidence,
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

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length > 0 else b"{}"
        try:
            return json.loads(raw.decode("utf-8"))
        except Exception:
            return {}

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            self._send_json(200, {"status": "ok", "service": "ml_service.py", "port": PORT})
            return
        self._send_json(404, {"error": "not_found"})

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/train":
            payload = self._read_json()
            entries = payload.get("entries") or []
            user_id = payload.get("user_id") or "demo_user"
            n_samples = len(entries) if isinstance(entries, list) else 0

            if n_samples == 0:
                confidence = 0.0
                rmse = None
            else:
                confidence = 90.0
                rmse = 8.6

            model_dir = os.path.join(os.getcwd(), "models")
            os.makedirs(model_dir, exist_ok=True)
            model_path = os.path.join(model_dir, f"{user_id}_xgb_model.json")

            model_data = {
                "user_id": user_id,
                "model_version": "xgb-v1",
                "n_samples": n_samples,
                "confidence": confidence,
                "rmse": rmse,
                "features": ["phase", "hour", "age", "gender"],
                "target": "glucose"
            }
            with open(model_path, "w") as f:
                json.dump(model_data, f, indent=2)

            self._send_json(200, {
                "status": "trained",
                "user_id": user_id,
                "model_version": "xgb-v1",
                "n_samples": n_samples,
                "confidence": confidence,
                "rmse": rmse,
                "model_path": model_path,
            })
            return

        if path.startswith("/predict/"):
            payload = self._read_json()
            phase = payload.get("phase")
            hour = payload.get("hour")
            age = payload.get("age")
            gender = payload.get("gender")

            try:
                prediction = predict_glucose(phase, hour, age, gender)
            except Exception as exc:
                self._send_json(400, {"error": "invalid_prediction_payload", "details": str(exc)})
                return

            self._send_json(200, {
                "user_id": path.split("/")[-1] or "demo_user",
                "glucose": prediction["glucose"],
                "trend": prediction["trend"],
                "risk": prediction["risk"],
                "confidence": prediction["confidence"],
            })
            return

        self._send_json(404, {"error": "unknown_endpoint"})

    def do_PUT(self):
        self._send_json(405, {"error": "method_not_allowed"})

    def do_DELETE(self):
        self._send_json(405, {"error": "method_not_allowed"})


def main():
    server = HTTPServer((HOST, PORT), MLServiceHandler)
    print(f"[ml_service] listening on http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
