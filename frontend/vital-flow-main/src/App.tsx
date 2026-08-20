import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTheme } from "@/hooks/useTheme";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import Index from "./pages/Index.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Profile from "./pages/Profile.tsx";
import History from "./pages/History.tsx";
import Reports from "./pages/Reports.tsx";
import AddDetails from "./pages/AddDetails.tsx";
import Calibration from "./pages/Calibration.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const ThemeBoot = () => {
  useTheme();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeBoot />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route
            path="/dashboard"
            element={
              <RequireOnboarding>
                <Dashboard />
              </RequireOnboarding>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireOnboarding>
                <Profile />
              </RequireOnboarding>
            }
          />
          <Route
            path="/history"
            element={
              <RequireOnboarding>
                <History />
              </RequireOnboarding>
            }
          />
          <Route
            path="/reports"
            element={
              <RequireOnboarding>
                <Reports />
              </RequireOnboarding>
            }
          />
          <Route
            path="/add"
            element={
              <RequireOnboarding>
                <AddDetails />
              </RequireOnboarding>
            }
          />
          <Route path="/calibration" element={<Calibration />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
