import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, User, History, PlusCircle, LogOut, FileText, Menu, X, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGlucoseStore } from "@/store/glucoseStore";
import { ThemeToggle } from "@/components/ThemeToggle";

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

  const logout = () => {
    setUser(null);
    setOnboardingComplete(false);
    navigate("/");
  };

  const isLinkActive = (to: string) => {
    return location.pathname === to;
  };

  const navItem = (l: typeof links[0], onClick?: () => void) => {
    const active = isLinkActive(l.to);
    return (
      <NavLink
        key={l.to}
        to={l.to}
        onClick={onClick}
        className={`relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-smooth ${
          active
            ? "text-primary bg-primary/5 font-semibold"
            : "text-muted-foreground hover:text-foreground hover:bg-slate-100/50 dark:hover:bg-slate-800/40"
        }`}
      >
        {active && (
          <motion.div
            layoutId="sidebar-active-indicator"
            className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary"
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          />
        )}
        <l.icon className={`h-4.5 w-4.5 shrink-0 ${active ? "text-primary" : "text-muted-foreground/80"}`} />
        <span>{l.label}</span>
      </NavLink>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-foreground dark:bg-[#0F172A]">
      {/* Desktop Sidebar (Fixed Left) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-20 w-64 flex-col border-r border-border bg-white dark:bg-[#1E293B] transition-all">
        {/* Logo and Brand */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-soft">
            <Activity className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">PulseIQ</span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 px-4 py-6">
          {links.map((l) => navItem(l))}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-border p-4 bg-slate-50/50 dark:bg-slate-900/10">
          {/* Connection Status & Theme Toggle */}
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur">
              <span className="relative flex h-2 w-2">
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`absolute inset-0 rounded-full ${connected ? "bg-success" : "bg-destructive"}`}
                />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${connected ? "bg-success" : "bg-destructive"}`} />
              </span>
              {connected ? "Live sync" : "Offline"}
            </div>
            <ThemeToggle />
          </div>

          {/* User profile & Logout */}
          <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-white dark:bg-[#1E293B] p-3 shadow-sm">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-sm font-semibold text-primary ring-1 ring-primary/20">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
              </div>
              <div className="truncate">
                <p className="font-display text-xs font-bold text-slate-900 dark:text-white leading-snug truncate">
                  {user?.name || "Patient Account"}
                </p>
                <p className="text-[10px] text-muted-foreground leading-none truncate">
                  {user?.email || "patient@pulseiq.com"}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-white dark:bg-[#1E293B] px-6 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-soft">
            <Activity className="h-4 w-4" />
          </div>
          <span className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white">PulseIQ</span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer (Collapsible slide-in Sidebar) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black lg:hidden"
            />

            {/* Slide-in panel */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white dark:bg-[#1E293B] border-r border-border shadow-2xl lg:hidden"
            >
              {/* Drawer Header */}
              <div className="flex h-16 items-center justify-between border-b border-border px-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-soft">
                    <Activity className="h-4 w-4" />
                  </div>
                  <span className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white">PulseIQ</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="flex-1 space-y-1.5 px-4 py-6">
                {links.map((l) => navItem(l, () => setMobileMenuOpen(false)))}
              </nav>

              {/* Drawer Footer */}
              <div className="border-t border-border p-4 bg-slate-50/50 dark:bg-slate-900/10">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur">
                    <span className="relative flex h-2 w-2">
                      <motion.span
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={`absolute inset-0 rounded-full ${connected ? "bg-success" : "bg-destructive"}`}
                      />
                      <span className={`relative inline-flex h-2 w-2 rounded-full ${connected ? "bg-success" : "bg-destructive"}`} />
                    </span>
                    {connected ? "Live sync" : "Offline"}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-white dark:bg-[#1E293B] p-3 shadow-sm">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-sm font-semibold text-primary ring-1 ring-primary/20">
                      {user?.avatar ? (
                        <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                      ) : (
                        initial
                      )}
                    </div>
                    <div className="truncate">
                      <p className="font-display text-xs font-bold text-slate-900 dark:text-white leading-snug truncate">
                        {user?.name || "Patient Account"}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-none truncate">
                        {user?.email || "patient@pulseiq.com"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    title="Sign out"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800 transition-colors shrink-0"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area (Offset on Desktop) */}
      <div className="lg:pl-64 min-h-screen">
        {children}
      </div>
    </div>
  );
}
