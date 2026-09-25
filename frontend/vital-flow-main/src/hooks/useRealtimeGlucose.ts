import { useEffect, useRef } from "react";
import { useGlucoseStore } from "@/store/glucoseStore";

let globalWs: WebSocket | null = null;

export function switchSensorMode(mode: "SIMULATION" | "REAL_ESP32") {
  useGlucoseStore.getState().setSensorMode(mode);
  if (globalWs && globalWs.readyState === WebSocket.OPEN) {
    globalWs.send(JSON.stringify({ type: "set_mode", mode }));
    console.log(`[WebSocket] Mode change requested to: ${mode}`);
  }
}

/**
 * Connects to the real WebSocket backend at localhost:5000.
 */
export function useRealtimeGlucose() {
  const pushReading = useGlucoseStore((s) => s.pushReading);
  const pushAlert = useGlucoseStore((s) => s.pushAlert);
  const setCalibration = useGlucoseStore((s) => s.setCalibration);
  const setConnected = useGlucoseStore((s) => s.setConnected);
  const setSensorMode = useGlucoseStore((s) => s.setSensorMode);
  const setEsp32Status = useGlucoseStore((s) => s.setEsp32Status);
  const setEsp32Data = useGlucoseStore((s) => s.setEsp32Data);

  const prevActivityRef = useRef<string>("");
  const prevRiskRef = useRef<string>("");

  useEffect(() => {
    // 1. Establish the connection to our backend server
    const ws = new WebSocket("ws://localhost:5000");
    globalWs = ws;

    // 2. When the connection opens, we update the store state to connected
    ws.onopen = () => {
      console.log("Connected to backend WebSocket!");
      setConnected(true);
    };

    // 3. Listen for messages coming from the backend server
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.mode) setSensorMode(data.mode);
        if (data.esp32Status !== undefined) setEsp32Status(data.esp32Status);
        setEsp32Data(data.esp32Data || null);
        
        if (data.glucose && data.glucose.length > 0) {
          // The backend sends an array of glucose readings. The first one is "Now".
          const currentValue = data.glucose[0].value;
          const currentRisk = (data.risk || "normal").toLowerCase();
          const motionLvl = data.motionLevel || (data.activity === "Active" ? "High" : data.activity === "Light Movement" ? "Moderate" : "Low");

          // Update the storefront state with the new value
          pushReading(currentValue);

          // Update vitals and health score fields in the store
          if (data.healthScore !== undefined) {
            useGlucoseStore.setState({
              heartRate: data.heartRate,
              temperature: data.temperature,
              gsr: data.gsr || 1250,
              stress: data.stress,
              activity: data.activity,
              motionLevel: motionLvl,
              healthScore: data.healthScore,
              healthCategory: data.healthCategory,
              healthExplanation: data.healthExplanation,
              healthRecommendations: data.healthRecommendations || []
            });
          }

          // Dynamic alert triggers on state transition
          if (data.activity && data.activity !== prevActivityRef.current) {
            if (prevActivityRef.current !== "") {
              pushAlert({
                type: data.activity === "Active" ? "warning" : "info",
                title: "Motion Activity Shift",
                message: `Activity state changed to "${data.activity}" (Motion Level: ${motionLvl})`
              });
            }
            prevActivityRef.current = data.activity;
          }

          if (currentValue > 140) {
            pushAlert({ type: "warning", title: "Elevated Glucose Warning", message: `Glucose reading at ${currentValue} mg/dL (Target: 70–140 mg/dL)` });
          } else if (currentValue < 70) {
            pushAlert({ type: "critical", title: "Low Glucose Alert", message: `Glucose reading dropped to ${currentValue} mg/dL (Target: 70–140 mg/dL)` });
          }

          if (currentRisk === "normal") {
            const currentAlerts = useGlucoseStore.getState().alerts;
            const now = Date.now();
            currentAlerts.forEach((a) => {
              if (now - a.time > 12000) {
                useGlucoseStore.getState().dismissAlert(a.id);
              }
            });
          }
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message", err);
      }
    };

    // 4. Handle disconnections and errors
    ws.onclose = () => {
      console.log("Disconnected from backend WebSocket.");
      setConnected(false);
      setEsp32Status("DISCONNECTED");
      globalWs = null;
    };
    ws.onerror = (error) => {
      console.error("WebSocket encountered an error:", error);
      setConnected(false);
      setEsp32Status("DISCONNECTED");
    };

    // We keep this synthetic calibration increase just for the UI effect
    const calTick = setInterval(() => {
      setCalibration(Math.min(100, useGlucoseStore.getState().calibration + 1));
    }, 8000);

    // 5. Cleanup: close connection and intervals when the hook is unmounted
    return () => {
      ws.close();
      globalWs = null;
      clearInterval(calTick);
    };
  }, [pushReading, pushAlert, setCalibration, setConnected, setSensorMode, setEsp32Status, setEsp32Data]);

  return { switchSensorMode };
}

