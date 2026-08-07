import { useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useGlucoseStore } from "@/store/glucoseStore";

/**
 * Listens to the Firestore "predictions" collection in real time.
 * Whenever the backend writes a new prediction, this hook picks it up
 * and pushes it directly into the Zustand global store — updating the
 * dashboard live without any page refresh.
 */
export function useLivePredictions() {
  const pushReading = useGlucoseStore((s) => s.pushReading);
  const pushAlert   = useGlucoseStore((s) => s.pushAlert);
  const setConnected = useGlucoseStore((s) => s.setConnected);

  useEffect(() => {
    const q = query(
      collection(db, "predictions"),
      orderBy("predicted_at", "desc"),
      limit(1)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const glucose = data.predicted_glucose as number;
          const risk    = (data.predicted_risk as string) || "normal";

          // Push reading into trend chart
          pushReading(glucose);
          setConnected(true);

          // Sync vitals and health score fields from Firestore
          if (data.health_score !== undefined) {
            useGlucoseStore.setState({
              heartRate: data.heart_rate,
              temperature: data.temperature,
              stress: data.stress_level,
              spo2: data.spo2,
              activity: data.activity_status,
              healthScore: data.health_score,
              healthCategory: data.health_category,
              healthExplanation: data.health_explanation,
              healthRecommendations: data.health_recommendations || []
            });
          }

          // Fire alerts based on risk
          if (risk === "high") {
            pushAlert({
              type: "warning",
              title: "Elevated glucose predicted",
              message: `Predicted: ${glucose} mg/dL`,
            });
          } else if (risk === "low") {
            pushAlert({
              type: "critical",
              title: "Low glucose predicted",
              message: `Predicted: ${glucose} mg/dL`,
            });
          }
        });
      },
      (err) => {
        console.error("Firestore onSnapshot error:", err.message);
        setConnected(false);
      }
    );

    return () => unsub();
  }, [pushReading, pushAlert, setConnected]);
}
