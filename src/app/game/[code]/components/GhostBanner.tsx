/**
 * GhostBanner - Bandeau affiché aux joueurs morts.
 *
 * Mourir ne doit pas vouloir dire s'ennuyer : le fantôme devient
 * omniscient (il voit tous les rôles dans la liste des joueurs et peut
 * lire le chat des loups) mais ne doit rien révéler aux vivants.
 * Y2K Sticker aesthetic.
 */

'use client';

import { motion } from 'framer-motion';
import { MotionCard, CardContent } from '@/components/ui';

export function GhostBanner() {
  return (
    <MotionCard
      variant="sticker"
      rotation={-0.5}
      className="border-moon-500/40 mb-4"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <CardContent className="py-4 text-center">
        <motion.p
          className="text-4xl mb-2"
          animate={{ y: [0, -4, 0], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          👻
        </motion.p>
        <p className="font-black text-white text-sm mb-1">
          Tu hantes désormais le village
        </p>
        <p className="text-xs text-moon-100/60">
          Tu vois tous les rôles et tu peux espionner le chat des loups.
          <br />
          <span className="font-bold text-moon-100/80">Motus : les morts ne parlent pas.</span>
        </p>
      </CardContent>
    </MotionCard>
  );
}
