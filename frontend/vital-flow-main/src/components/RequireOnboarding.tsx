import { Navigate } from "react-router-dom";
import { useGlucoseStore } from "@/store/glucoseStore";

export function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const onboardingComplete = useGlucoseStore((s) => s.onboardingComplete);
  if (!onboardingComplete) return <Navigate to="/" replace />;
  return <>{children}</>;
}
