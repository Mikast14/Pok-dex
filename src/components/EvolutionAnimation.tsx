import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface EvolutionAnimationProps {
  fromName: string;
  toName: string;
  fromSprite: string;
  toSprite: string;
  onDone?: () => void;
  durationMs?: number;
}

const EvolutionAnimation: React.FC<EvolutionAnimationProps> = ({ fromName, toName, fromSprite, toSprite, onDone, durationMs = 1800 }) => {
  const [phase, setPhase] = useState<'start' | 'flash' | 'done'>('start');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('flash'), Math.max(400, durationMs * 0.55));
    const t2 = setTimeout(() => { setPhase('done'); onDone && onDone(); }, durationMs);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [durationMs, onDone]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70">
      {/* Energy rings */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        {[0,1,2,3].map(i => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            initial={{ opacity: 0.25, scale: 0.4 }}
            animate={{ opacity: [0.35, 0.1, 0], scale: [0.4, 1.2, 1.8] }}
            transition={{ duration: 1.2, delay: i * 0.15, ease: 'easeOut' }}
            style={{ width: 240 + i * 30, height: 240 + i * 30, border: '4px solid rgba(147,197,253,0.6)', boxShadow: '0 0 22px rgba(147,197,253,0.6)' }}
          />
        ))}
      </div>

      {/* Rotating sparkles */}
      <motion.div
        className="absolute"
        initial={{ rotate: 0, opacity: 0.8 }}
        animate={{ rotate: 360, opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2.0, ease: 'linear', repeat: Infinity }}
        style={{ width: 360, height: 360 }}
      >
        {[...Array(8)].map((_, k) => (
          <div key={k} className="absolute text-blue-300" style={{ left: '50%', top: '50%' }}>
            <div style={{ transform: `translate(${Math.cos((k/8)*Math.PI*2)*150}px, ${Math.sin((k/8)*Math.PI*2)*150}px)` }}>✦</div>
          </div>
        ))}
      </motion.div>

      {/* Sprites crossfade */}
      <div className="relative flex flex-col items-center">
        <div className="text-white/90 dark:text-slate-100 font-semibold mb-3">{fromName} is evolving…</div>
        <div className="relative w-72 h-72">
          <motion.img
            src={fromSprite}
            alt={fromName}
            className="absolute inset-0 w-full h-full object-contain"
            initial={{ opacity: 1, scale: 1 }}
            animate={phase === 'start' ? { opacity: [1, 0.7, 0.4, 0.2], scale: [1, 1.1, 1.2, 1.25] } : { opacity: 0 }}
            transition={{ duration: durationMs / 1000 * 0.6 }}
          />
          <motion.img
            src={toSprite}
            alt={toName}
            className="absolute inset-0 w-full h-full object-contain"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={phase === 'flash' ? { opacity: [0, 0.4, 1], scale: [0.8, 1.05, 1] } : { opacity: 0 }}
            transition={{ duration: durationMs / 1000 * 0.45 }}
          />
          {phase === 'flash' && (
            <motion.div
              className="absolute inset-0 rounded-full"
              initial={{ opacity: 0.9, scale: 0.6 }}
              animate={{ opacity: [0.9, 0], scale: [0.6, 1.3] }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{ background: 'radial-gradient(circle at center, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.2) 40%, transparent 70%)' }}
            />
          )}
        </div>
        {phase !== 'done' ? (
          <div className="text-white/80 dark:text-slate-200 mt-2 text-sm">Please wait…</div>
        ) : (
          <div className="text-white dark:text-slate-100 mt-2 text-lg font-bold">Congratulations! Your {fromName} evolved into {toName}!</div>
        )}
      </div>
    </div>
  );
};

export default EvolutionAnimation;



