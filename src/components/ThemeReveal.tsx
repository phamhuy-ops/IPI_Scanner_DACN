import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { ThemeMode } from '../store/useStore';

interface ThemeRevealProps {
  theme: ThemeMode;
  onCovered: () => void;
  onComplete: () => void;
}

export function ThemeReveal({ theme, onCovered, onComplete }: ThemeRevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<'reveal' | 'hold' | 'exit'>('reveal');

  useEffect(() => {
    if (phase !== 'hold') return undefined;
    const timer = window.setTimeout(() => setPhase('exit'), shouldReduceMotion ? 80 : 2500);
    return () => window.clearTimeout(timer);
  }, [phase, shouldReduceMotion]);

  const revealAnimation = { opacity: 1 };
  const exitAnimation = { opacity: 0 };

  return (
    <motion.div
      aria-live="polite"
      role="status"
      className={`theme-reveal theme-reveal--${theme}`}
      initial={{ opacity: 0 }}
      animate={phase === 'exit' ? exitAnimation : revealAnimation}
      transition={{ duration: phase === 'exit' ? 0.25 : shouldReduceMotion ? 1 : 10, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={() => {
        if (phase === 'reveal') {
          onCovered();
          setPhase('hold');
          return;
        }
        if (phase === 'exit') onComplete();
      }}
    >
      <motion.div
        className="theme-reveal-content"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: phase === 'exit' ? 0 : 1, y: phase === 'exit' ? -8 : 0 }}
        transition={{ duration: 0.25, delay: phase === 'reveal' && !shouldReduceMotion ? 10 : 0 }}
      >
        <motion.img
          className="theme-reveal-icon"
          src="./app-icon.png"
          alt=""
          animate={phase === 'exit' ? { scale: 0.94, opacity: 0 } : { scale: [1, 1.08, 1] }}
          transition={phase === 'exit'
            ? { duration: 0.16 }
            : { duration: 1.1, ease: 'easeInOut', repeat: Infinity }}
        />
        <div className="theme-reveal-brand">SENTINEL</div>
        <div className="theme-reveal-status">Switching to {theme === 'light' ? 'light' : 'dark'} theme</div>
      </motion.div>
    </motion.div>
  );
}
