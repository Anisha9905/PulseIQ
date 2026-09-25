# PulseIQ – Multi-Sensor Fusion & ML Non-Invasive Blood Glucose Monitoring

PulseIQ is an end-to-end software prototype designed to estimate blood glucose levels non-invasively using multimodal sensor data (PPG, GSR, Skin Temperature, Accelerometer) and personalized machine learning (XGBoost).

---

## 🏗️ System Architecture

```
                                 ┌─────────────────────────────────┐
                                 │   React / Vite Web Dashboard    │
                                 │    http://localhost:5173        │
                                 └────────────────┬────────────────┘
                                                  │
                                            WebSocket / HTTP
                                                  │
                                                  ▼
┌──────────────────────────────┐          ┌─────────────────────────────────┐
│ ESP32 Hardware / Simulator   ├─────────►│ Node.js Backend & WS Server     │
│ (Telemetry / Sensor Packets) │          │    http://localhost:5000        │
└──────────────────────────────┘          └────────────────┬────────────────┘
                                                           │
                                                      HTTP POST /predict
                                                           │
                                                           ▼
                                          ┌─────────────────────────────────┐
                                          │   Python XGBoost ML Service     │
                                          │    http://localhost:8001        │
                                          └─────────────────────────────────┘
```

---

## 📋 Prerequisites

Ensure you have the following installed on your system:
* **Node.js**: v18.x or higher
* **npm**: v9.x or higher
* **Python**: v3.9 or higher (with `pip`)

---

## ⚙️ Installation & Setup

### 1. Python Environment (ML Service)
Navigate to the backend directory and install Python dependencies:
```powershell
cd backend
pip install -r requirements.txt
```
*Dependencies installed:* `numpy`, `xgboost`

### 2. Node.js Backend Server
Navigate to the backend directory and install Node packages:
```powershell
cd backend
npm install
```

### 3. Frontend Web Dashboard
Navigate to the frontend dashboard directory and install Node packages:
```powershell
cd frontend/vital-flow-main
npm install
```

---

## 🚀 How to Run PulseIQ (3 Terminal Windows)

To run the full PulseIQ system, open **3 separate terminal windows** (or tabs):

### Terminal 1: Start the Python ML Service
```powershell
cd backend
python ml_service.py
```
* Running at: `http://localhost:8001`
* Role: Trains XGBoost models per user and processes live glucose prediction requests.

---

### Terminal 2: Start the Node.js Backend Server
```powershell
cd backend
npm run dev
```
* Running at: `http://localhost:5000` (WebSocket at `ws://localhost:5000`)
* Role: Handles ESP32 telemetry parsing, real-time WebSocket communication, and Firebase sync.

---

### Terminal 3: Start the Frontend React Dashboard
```powershell
cd frontend/vital-flow-main
npm run dev
```
* Running at: `http://localhost:5173` (or the port displayed by Vite)
* Role: Interactive dashboard for live glucose telemetry, risk assessment, trends, and calibration.

---

## 🧪 Testing & Workflow Verification Scripts

You can run automated verification tests to test the pipeline without physical hardware.

> **Note:** Ensure **Terminal 1** (`ml_service.py`) is running before executing these tests.

### 1. End-to-End Workflow Verification Test
Simulates a 7-day user calibration sequence and sends reference readings to the ML service to train a model.
```powershell
python test_workflow.py
```

### 2. Multimodal Sensor Fusion Proof Test
Tests live sensor telemetry changes (Normal vs Elevated physical state) to prove how live sensor data influences predicted glucose values.
```powershell
python prove_fusion.py
```

---

## 📡 Key Endpoints & Services Summary

| Service | Technology | Port / URL | Description |
| :--- | :--- | :--- | :--- |
| **ML Engine** | Python / XGBoost | `http://localhost:8001` | Calibration training & glucose prediction |
| **Backend API** | Node.js / Express | `http://localhost:5000` | Telemetry endpoint (`/api/v1/telemetry`) & health check |
| **WebSocket** | Node.js `ws` | `ws://localhost:5000` | Real-time sensor data streaming |
| **Frontend** | React / Vite | `http://localhost:5173` | User interface and live monitor |

---

## 📁 Project Structure

```
PulseIQ-main/
├── backend/
│   ├── ml_service.py        # Python XGBoost ML Server (Port 8001)
│   ├── server.js            # Node.js Express & WebSocket Server (Port 5000)
│   ├── sensor_parser.js     # ESP32 packet parsing & validation
│   ├── requirements.txt     # Python requirements (numpy, xgboost)
│   └── package.json         # Node backend package configuration
├── frontend/
│   └── vital-flow-main/     # React + Vite Dashboard App (Port 5173)
│       └── package.json
├── prove_fusion.py          # Multimodal sensor impact test script
├── test_workflow.py         # End-to-end 7-day calibration & workflow test
└── README.md                # System execution guide & documentation
```
