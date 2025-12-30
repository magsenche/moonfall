/**
 * DayPhaseLayout - Day discussion phase layout
 * Y2K Sticker aesthetic
 *
 * Uses GameContext - no props needed.
 */

'use client';

import { motion } from 'framer-motion';
import { MotionCard, CardContent } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useGame } from '../context';
import { PlayerRoleCard } from './PlayerRoleCard';
import { AssassinPowerPanel } from './AssassinPowerPanel';
import { WildChildModelPanel } from './WildChildModelPanel';

export function DayPhaseLayout() {
  const { 
    game,
    currentPlayerId,
    currentRole, 
    roleConfig, 
    isWolf,
    isAssassin,
    isWildChild,
    alivePlayers,
    isAlive,
  } = useGame();

  return (
    <div className="space-y-4">
      {/* Day atmosphere instruction */}
      <MotionCard
        variant="sticker"
        rotation={-0.5}
        className="border-amber-500/50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <CardContent className="pt-5 pb-4">
          <div className="text-center">
            <motion.p 
              className="text-4xl mb-2"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              ☀️
            </motion.p>
            <h3 className="font-black text-white text-lg mb-2" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>
              Le jour se lève
            </h3>
            <p className="text-slate-300 text-sm">
              {isAssassin
                ? '🗡️ Choisissez le bon moment pour frapper...'
                : isWolf
                  ? '🐺 Mêlez-vous aux villageois et détournez les soupçons...'
                  : '👀 Discutez avec les autres villageois et trouvez les loups-garous !'}
            </p>
          </div>
        </CardContent>
      </MotionCard>

      {/* Player's Role Card */}
      {currentRole && roleConfig && <PlayerRoleCard role={currentRole} roleConfig={roleConfig} />}

      {/* Assassin Power (can use during day) */}
      {isAssassin && isAlive && (
        <AssassinPowerPanel
          alivePlayers={alivePlayers}
          currentPlayerId={currentPlayerId}
          gameCode={game.code}
          gamePhase={game.current_phase ?? 1}
        />
      )}

      {/* Wild Child Model Status (visible during day too) */}
      {isWildChild && isAlive && (
        <WildChildModelPanel
          alivePlayers={alivePlayers}
          currentPlayerId={currentPlayerId}
          gameCode={game.code}
          gamePhase={game.current_phase ?? 1}
        />
      )}

      {/* Discussion tips */}
      <MotionCard 
        variant="sticker" 
        rotation={0.5}
        className="border-zinc-600"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <CardContent className="py-6">
          <div className="text-center space-y-3">
            <p className="text-3xl">💬</p>
            <div>
              <h4 className="font-bold text-white mb-1">Phase de discussion</h4>
              <p className="text-slate-400 text-sm">
                Échangez avec les autres joueurs, partagez vos suspicions, et préparez-vous pour
                le conseil du village.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {['🎭 Observez', '🔍 Questionnez', '🤝 Alliez-vous'].map((tip, i) => (
                <motion.span 
                  key={tip}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium",
                    "bg-zinc-700 border border-white/20 text-slate-200",
                    "shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                  )}
                >
                  {tip}
                </motion.span>
              ))}
            </div>
          </div>
        </CardContent>
      </MotionCard>
    </div>
  );
}
