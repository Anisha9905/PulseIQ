@echo off
title PulseIQ Service Launcher
echo =========================================================================
echo                   PULSEIQ FULL STACK SERVICE LAUNCHER
echo =========================================================================
echo.
echo Launching all 3 core application services in separate windows...
echo.

echo [1/3] Starting Python XGBoost ML Service (Port 8001)...
start "PulseIQ ML Service (Port 8001)" cmd /k "cd /d %~dp0backend && python ml_service.py"

timeout /t 2 >nul

echo [2/3] Starting Node.js Backend & WebSocket Server (Port 5000)...
start "PulseIQ Node Backend (Port 5000)" cmd /k "cd /d %~dp0backend && npm run dev"

timeout /t 2 >nul

echo [3/3] Starting React Vite Frontend Dashboard (Port 5173)...
start "PulseIQ Frontend Dashboard (Port 5173)" cmd /k "cd /d %~dp0frontend\vital-flow-main && npm run dev"

echo.
echo =========================================================================
echo   All 3 PulseIQ Core Services are running!
echo   -----------------------------------------------------------------------
echo   - Python ML Service : http://localhost:8001
echo   - Backend Server    : http://localhost:5000 (WebSocket ws://localhost:5000)
echo   - Frontend Dashboard: http://localhost:5173
echo.
echo   [OPTIONAL - Bluetooth ESP32 Hardware]
echo   If using Bluetooth instead of Wi-Fi HTTP POST, launch in terminal:
echo   python hardware/bluetooth_receiver.py
echo =========================================================================
pause

