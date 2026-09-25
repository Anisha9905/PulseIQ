import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { motion, AnimatePresence } from "framer-motion";
import { MagneticButton } from "@/components/MagneticButton";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <MagneticButton
      onClick={toggle}
      aria-label="Toggle theme"
      className="relative h-10 w-10 rounded-full border border-border bg-card/60 backdrop-blur transition-smooth hover:scale-105 hover:shadow-soft flex items-center justify-center text-muted-foreground hover:text-foreground"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {theme === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </motion.span>
      </AnimatePresence>
    </MagneticButton>
  );
}
