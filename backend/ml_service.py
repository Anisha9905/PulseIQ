"""
PulseIQ — XGBoost ML Microservice
==================================
Runs on http://localhost:8001

Endpoints
---------
POST /train
    Body: { "user_id": str, "entries": [{ "day": 1-7, "phase": 0-3, "glucose": int, "age": int, "gender": 0-2 }] }
    Trains an XGBoost regressor per user, saves model to ./models/{user_id}.json
    Returns: { "success": bool, "user_id": str, "score": float }

POST /predict/{user_id}
    Body: { "phase": 0-3, "hour": 0-23, "age": int, "gender": 0-2 }
    Returns: { "glucose": float, "trend": str, "risk": str, "confidence": float }

POST /sensor-data
    Body: { "ax": float, "ay": float, "az": float, "gx": float, "gy": float, "gz": float, "temp": float }
    Stores latest MPU6050 accelerometer & gyroscope data for realtime access.

GET /sensor-data/latest
    Returns the latest MPU6050 accelerometer & gyroscope readings.
"""

import os, json, math, time, threading
from pathlib import Path
from typing import List, Optional, Dict, Any

import numpy as np
import joblib
import xgboost as xgb
from sklearn.preprocessing import LabelEncoder
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="PulseIQ ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODELS_DIR = Path("./models")
MODELS_DIR.mkdir(exist_ok=True)

# ── In-memory store of last predicted values per user (for trend calculation) ──
last_predicted: dict[str, float] = {}


# ── MPU Sensor Realtime Data Store & WebSocket Manager ─────────────────────────
mpu_lock = threading.Lock()
latest_mpu_data: dict[str, Any] = {
    "status": "waiting_for_data",
    "timestamp": None,
    "data": None
}

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self._lock = threading.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        with self._lock:
            self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        with self._lock:
            connections = list(self.active_connections)
        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()


# ── Pydantic schemas ────────────────────────────────────────────────────────────
class GlucoseEntry(BaseModel):
    day: int          # 1-7
    phase: int        # 0=fasting, 1=before_meal, 2=after_meal, 3=post_activity
    glucose: float
    age: int
    gender: int       # 0=male, 1=female, 2=other

class TrainRequest(BaseModel):
    user_id: str
    entries: List[GlucoseEntry]

class PredictRequest(BaseModel):
    phase: int        # 0-3
    hour: int         # 0-23
    age: int
    gender: int       # 0=male, 1=female, 2=other

class MPUSensorPayload(BaseModel):
    ax: Optional[float] = None  # Accelerometer X
    ay: Optional[float] = None  # Accelerometer Y
    az: Optional[float] = None  # Accelerometer Z
    gx: Optional[float] = None  # Gyroscope X
    gy: Optional[float] = None  # Gyroscope Y
    gz: Optional[float] = None  # Gyroscope Z
    temp: Optional[float] = None # Temperature
    raw: Optional[str] = None
    timestamp: Optional[float] = None


# ── Feature builder ─────────────────────────────────────────────────────────────
def build_features(day: int, phase: int, hour: int, age: int, gender: int) -> np.ndarray:
    """
    Features: [day, phase, hour, age, gender, sin_hour, cos_hour, phase_sin, phase_cos]
    Cyclical encoding for hour and phase gives the model temporal awareness.
    """
    sin_hour  = math.sin(2 * math.pi * hour  / 24)
    cos_hour  = math.cos(2 * math.pi * hour  / 24)
    sin_phase = math.sin(2 * math.pi * phase / 4)
    cos_phase = math.cos(2 * math.pi * phase / 4)
    return np.array([[day, phase, hour, age, gender, sin_hour, cos_hour, sin_phase, cos_phase]])


# ── Phase → typical hour mapping ────────────────────────────────────────────────
PHASE_HOURS = {
    0: 7,   # fasting — 7 AM
    1: 12,  # before_meal — noon
    2: 14,  # after_meal — 2 PM
    3: 18,  # post_activity — 6 PM
}


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: Train
# ══════════════════════════════════════════════════════════════════════════════
@app.post("/train")
async def train(req: TrainRequest):
    if len(req.entries) < 4:
        raise HTTPException(status_code=400, detail="Need at least 4 glucose entries to train.")

    X, y = [], []
    for e in req.entries:
        hour = PHASE_HOURS.get(e.phase, 12)
        feat = build_features(e.day, e.phase, hour, e.age, e.gender)
        X.append(feat[0])
        y.append(e.glucose)

    X = np.array(X)
    y = np.array(y)

    # ── XGBoost regressor ──────────────────────────────────────────────────────
    model = xgb.XGBRegressor(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42,
        verbosity=0,
    )
    model.fit(X, y)

    # Score: 1 - RMSE/mean (lower RMSE = higher confidence)
    preds = model.predict(X)
    rmse  = float(np.sqrt(np.mean((preds - y) ** 2)))
    mean  = float(np.mean(y))
    confidence = round(max(0.0, 1.0 - rmse / max(mean, 1)) * 100, 1)

    # Save model
    model_path = MODELS_DIR / f"{req.user_id}.ubj"
    joblib.dump(model, str(model_path))

    print(f"[ML] Trained model for {req.user_id} | RMSE={rmse:.2f} | Confidence={confidence}%")
    return {
        "success": True,
        "user_id": req.user_id,
        "confidence": confidence,
        "rmse": round(rmse, 2),
        "n_samples": len(req.entries),
    }


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: Predict
# ══════════════════════════════════════════════════════════════════════════════
@app.post("/predict/{user_id}")
async def predict(user_id: str, req: PredictRequest):
    model_path = MODELS_DIR / f"{user_id}.ubj"
    if not model_path.exists():
        raise HTTPException(status_code=404, detail=f"No trained model found for user '{user_id}'. Train first.")

    model = joblib.load(str(model_path))

    feat    = build_features(1, req.phase, req.hour, req.age, req.gender)
    glucose = float(model.predict(feat)[0])
    glucose = round(max(50.0, min(400.0, glucose)), 1)  # clamp to safe range

    # Trend: compare to last prediction
    prev    = last_predicted.get(user_id, glucose)
    diff    = glucose - prev
    trend   = "rising" if diff > 3 else "falling" if diff < -3 else "stable"

    # Risk
    risk    = "high" if glucose > 160 else "low" if glucose < 70 else "normal"

    # Confidence: 100% minus proportional deviation from training range
    # Simple heuristic — real app would track training range
    confidence = round(min(99.0, max(60.0, 95.0 - abs(diff) * 0.5)), 1)

    last_predicted[user_id] = glucose

    return {
        "user_id": user_id,
        "glucose": glucose,
        "trend": trend,
        "risk": risk,
        "confidence": confidence,
    }


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS: Realtime MPU6050 Accelerometer & Gyroscope Data
# ══════════════════════════════════════════════════════════════════════════════
@app.post("/sensor-data")
async def receive_mpu_data(payload: MPUSensorPayload):
    ts = payload.timestamp or time.time()
    incoming = {k: v for k, v in payload.model_dump().items() if v is not None}
    incoming["timestamp"] = ts

    with mpu_lock:
        global latest_mpu_data
        current_data = (latest_mpu_data.get("data") or {}) if isinstance(latest_mpu_data.get("data"), dict) else {}
        merged_data = {**current_data, **incoming}

        record = {
            "status": "online",
            "timestamp": ts,
            "data": merged_data
        }
        latest_mpu_data = record

    await manager.broadcast(record)
    return {"success": True, "timestamp": ts, "received": merged_data}



@app.get("/sensor-data/latest")
async def get_latest_mpu_data():
    with mpu_lock:
        return latest_mpu_data


@app.websocket("/ws/sensor-data")
async def websocket_mpu_data(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        with mpu_lock:
            current = dict(latest_mpu_data)
        await websocket.send_json(current)
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: Health check
# ══════════════════════════════════════════════════════════════════════════════
@app.get("/health")
async def health():
    models = [p.stem for p in MODELS_DIR.glob("*.ubj")]
    return {"status": "ok", "trained_users": models}


if __name__ == "__main__":
    uvicorn.run("ml_service:app", host="127.0.0.1", port=8001, reload=False)
