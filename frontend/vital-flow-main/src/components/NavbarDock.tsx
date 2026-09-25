import { useRef } from "react";
import { NavLink } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { LucideIcon } from "lucide-react";

export interface DockLink {
  to: string;
  label: string;
  icon: LucideIcon;
}

interface NavbarDockProps {
  links: DockLink[];
  activePath: string;
}

export function NavbarDock({ links, activePath }: NavbarDockProps) {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.nav
      onMouseMove={(e) => mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className="hidden md:flex items-center gap-1.5 rounded-full bg-slate-100/80 dark:bg-slate-800/60 p-1.5 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-md shadow-sm transition-all"
    >
      {links.map((link) => {
        const isActive = activePath === link.to;
        return (
          <DockItem
            key={link.to}
            link={link}
            isActive={isActive}
            mouseX={mouseX}
          />
        );
      })}
    </motion.nav>
  );
}

function DockItem({
  link,
  isActive,
  mouseX,
}: {
  link: DockLink;
  isActive: boolean;
  mouseX: any;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  // Calculate distance from mouse cursor to center of this dock item
  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  // Dynamic values based on mouse proximity
  const scaleSync = useTransform(distance, [-150, 0, 150], [1, 1.1, 1]);
  const scale = useSpring(scaleSync, { stiffness: 300, damping: 22 });

  // Vertical lift on hover
  const ySync = useTransform(distance, [-150, 0, 150], [0, -3, 0]);
  const y = useSpring(ySync, { stiffness: 300, damping: 22 });

  const Icon = link.icon;

  return (
    <NavLink
      ref={ref}
      to={link.to}
      className="relative flex items-center"
    >
      <motion.div
        style={{ scale, y }}
        className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
          isActive
            ? "text-primary font-semibold"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {/* Single clean active pill indicator without extra heavy inner box border */}
        {isActive && (
          <motion.div
            layoutId="navbar-dock-active-pill"
            className="absolute inset-0 rounded-full bg-white dark:bg-slate-900 shadow-sm"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}

        <Icon
          className={`h-4 w-4 shrink-0 relative z-10 transition-colors duration-200 ${
            isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
          }`}
        />
        <span className="relative z-10 whitespace-nowrap">{link.label}</span>
      </motion.div>
    </NavLink>
  );
}
