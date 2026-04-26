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
"""

import os, json, math, time, threading
from pathlib import Path
from typing import List, Optional

import numpy as np
import joblib
import xgboost as xgb
from sklearn.preprocessing import LabelEncoder
from fastapi import FastAPI, HTTPException
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
# ENDPOINT: Health check
# ══════════════════════════════════════════════════════════════════════════════
@app.get("/health")
async def health():
    models = [p.stem for p in MODELS_DIR.glob("*.ubj")]
    return {"status": "ok", "trained_users": models}


if __name__ == "__main__":
    uvicorn.run("ml_service:app", host="127.0.0.1", port=8001, reload=False)
