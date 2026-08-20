/**
 * PhaseHint - Consigne de phase en une ligne.
 *
 * Remplace les grosses cartes d'ambiance des layouts de phase : le badge du
 * header porte déjà le nom de la phase et le timer, cette bande ne dit que
 * « quoi faire maintenant ». Une ligne, pour que l'action de la phase reste
 * au-dessus du fold sur mobile.
 */

'use client';

import { motion } from 'framer-motion';
import { MotionCard, CardContent } from '@/components/ui';

interface PhaseHintProps {
  emoji: string;
  children: React.ReactNode;
  className?: string;
}

export function PhaseHint({ emoji, children, className }: PhaseHintProps) {
  return (
    <MotionCard
      variant="sticker"
      rotation={-0.4}
      className={className ? `p-4 ${className}` : 'p-4'}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <CardContent>
        <div className="flex items-center gap-3">
          <motion.span
            className="text-2xl shrink-0"
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            {emoji}
          </motion.span>
          <p className="text-moon-100/80 text-sm leading-snug">{children}</p>
        </div>
      </CardContent>
    </MotionCard>
  );
}
