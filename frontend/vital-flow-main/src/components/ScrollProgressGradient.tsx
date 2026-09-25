import { motion, useScroll, useSpring } from "framer-motion";

export function ScrollProgressGradient() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 25,
    restDelta: 0.001,
  });

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[3px] pointer-events-none overflow-hidden">
      <motion.div
        style={{ scaleX, transformOrigin: "0%" }}
        className="h-full w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 dark:from-blue-400 dark:via-cyan-400 dark:to-teal-300 shadow-[0_0_12px_rgba(59,130,246,0.8)]"
      />
    </div>
  );
}
