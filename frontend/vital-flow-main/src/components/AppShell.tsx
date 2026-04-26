import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, User, History, PlusCircle, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { useGlucoseStore } from "@/store/glucoseStore";
import { ThemeToggle } from "@/components/ThemeToggle";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/history", label: "History", icon: History },
  { to: "/add", label: "Add Details", icon: PlusCircle },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const user = useGlucoseStore((s) => s.user);
  const connected = useGlucoseStore((s) => s.connected);
  const setUser = useGlucoseStore((s) => s.setUser);
  const setOnboardingComplete = useGlucoseStore((s) => s.setOnboardingComplete);

  const initial = (user?.name?.[0] || "A").toUpperCase();

  const logout = () => {
    setUser(null);
    setOnboardingComplete(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-primary-glow shadow-soft" />
            <span className="font-display text-base font-semibold tracking-tight">PulseIQ</span>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-smooth ${
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-full bg-accent"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <span className="relative flex items-center gap-2">
                      <l.icon className="h-4 w-4" />
                      {l.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur sm:flex">
              <span className="relative flex h-2 w-2">
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`absolute inset-0 rounded-full ${connected ? "bg-success" : "bg-destructive"}`}
                />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${connected ? "bg-success" : "bg-destructive"}`} />
              </span>
              {connected ? "Live" : "Offline"}
            </div>
            <ThemeToggle />
            <button
              onClick={logout}
              title="Sign out"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-smooth hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary/20 to-primary-glow/30 text-sm font-semibold text-primary">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-smooth ${
                  isActive ? "bg-accent text-primary" : "text-muted-foreground"
                }`
              }
            >
              <l.icon className="h-3.5 w-3.5" />
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {children}
    </div>
  );
}
