import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, User, History, PlusCircle, LogOut, FileText, Menu, X, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useGlucoseStore } from "@/store/glucoseStore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AlertsStack } from "@/components/dashboard/AlertsStack";
import { InteractiveGradientBackground } from "@/components/InteractiveGradientBackground";
import { Logo } from "@/components/Logo";
import { NavbarDock } from "@/components/NavbarDock";
import { ScrollProgressGradient } from "@/components/ScrollProgressGradient";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/history", label: "History", icon: History },
  { to: "/add", label: "Add Details", icon: PlusCircle },
  { to: "/reports", label: "Reports", icon: FileText },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useGlucoseStore((s) => s.user);
  const connected = useGlucoseStore((s) => s.connected);
  const setUser = useGlucoseStore((s) => s.setUser);
  const setOnboardingComplete = useGlucoseStore((s) => s.setOnboardingComplete);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const initial = (user?.name?.[0] || "A").toUpperCase();

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("Firebase sign-out was already resolved by the client.", err);
    } finally {
      setUser(null);
      setOnboardingComplete(false);
      navigate("/");
    }
  };

  const isLinkActive = (to: string) => {
    return location.pathname === to;
  };

  return (
    <InteractiveGradientBackground className="text-foreground">
      <ScrollProgressGradient />
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-md shadow-sm transition-all">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* 1. Brand Logo */}
          <Logo size="md" />

          {/* 2. Interactive Dock Navigation Bar (Desktop & Tablet) */}
          <NavbarDock links={links} activePath={location.pathname} />

          {/* 3. Right Status Controls & User Account */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {/* Live Sync Badge */}
            <div className="flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur shadow-xs">
              <span className="relative flex h-2 w-2">
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`absolute inset-0 rounded-full ${connected ? "bg-emerald-500" : "bg-rose-500"}`}
                />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-rose-500"}`} />
              </span>
              <span>{connected ? "Live sync" : "Offline"}</span>
            </div>

            <ThemeToggle />

            {/* User Account Chip */}
            <div className="flex items-center gap-2.5 rounded-2xl border border-border/80 bg-white dark:bg-[#1E293B] pl-2 pr-1.5 py-1 shadow-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-xs font-bold text-primary ring-1 ring-primary/20">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white max-w-[110px] truncate">
                {user?.name || "Patient"}
              </span>
              <button
                onClick={logout}
                title="Sign out"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800 transition-colors ml-0.5 shrink-0"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

        </div>

        {/* Mobile Dropdown Menu Bar */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden md:hidden border-t border-border bg-white dark:bg-[#1E293B] px-4 py-4 space-y-2 shadow-lg"
            >
              <nav className="grid grid-cols-2 gap-2">
                {links.map((l) => {
                  const active = isLinkActive(l.to);
                  return (
                    <NavLink
                      key={l.to}
                      to={l.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                        active
                          ? "bg-primary text-primary-foreground shadow-soft"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <l.icon className="h-4 w-4" />
                      <span>{l.label}</span>
                    </NavLink>
                  );
                })}
              </nav>

              <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.name} className="h-full w-full object-cover rounded-xl" />
                    ) : (
                      initial
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{user?.name || "Patient"}</p>
                    <p className="text-[10px] text-muted-foreground">{user?.email || "demo@pulseiq.com"}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-500"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content Area — 100% Full Width (No Left Sidebar Offset) */}
      <div className="flex-1 w-full min-h-screen">
        {children}
      </div>
      <AlertsStack />
    </InteractiveGradientBackground>
  );
}
