/**
 * WolfPack - Display wolf teammates
 * Y2K Sticker aesthetic
 */

'use client';

import { motion } from 'framer-motion';
import { MotionCard, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { PlayerAvatar } from '@/components/game';
import { cn } from '@/lib/utils';
import type { PartialPlayer } from '../hooks/types';

interface WolfPackProps {
  wolves: PartialPlayer[];
}

export function WolfPack({ wolves }: WolfPackProps) {
  if (wolves.length <= 1) return null;

  return (
    <MotionCard 
      variant="sticker" 
      rotation={0.5}
      className="mb-6 border-red-500/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <CardHeader>
        <CardTitle className="text-red-400 text-lg flex items-center gap-2">
          <motion.span
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🐺
          </motion.span>
          Meute des Loups
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {wolves.map((wolf, i) => (
            <motion.div 
              key={wolf.id} 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl",
                "bg-red-900/30 border border-red-500/50",
                "shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
              )}
            >
              <PlayerAvatar playerId={wolf.id} pseudo={wolf.pseudo} size="sm" />
              <span className="text-white font-medium text-sm">{wolf.pseudo}</span>
            </motion.div>
          ))}
        </div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={cn(
            "inline-block mt-4 px-3 py-1.5 rounded-full text-xs font-medium",
            "bg-red-900/40 border border-red-500/30 text-red-300"
          )}
        >
          🩸 Chaque nuit, choisissez ensemble une victime
        </motion.p>
      </CardContent>
    </MotionCard>
  );
}
