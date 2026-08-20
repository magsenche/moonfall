/**
 * DayPhaseLayout - Day discussion phase layout
 * Y2K Sticker aesthetic
 *
 * Uses GameContext - no props needed.
 */

'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useGame } from '../context';
import { PhaseHint } from './PhaseHint';
import { PlayerRoleCard } from './PlayerRoleCard';
import { AssassinPowerPanel } from './AssassinPowerPanel';
import { WildChildModelPanel } from './WildChildModelPanel';
import { CupidonLoversPanel } from './CupidonLoversPanel';

export function DayPhaseLayout() {
  const { 
    game,
    currentPlayerId,
    currentRole, 
    roleConfig, 
    isWolf,
    isAssassin,
    isWildChild,
    isCupidon,
    alivePlayers,
    isAlive,
  } = useGame();

  return (
    <div className="space-y-4">
      {/* Consigne du jour : une ligne — le jour se joue à voix haute, pas sur
          le téléphone */}
      <PhaseHint emoji="☀️" className="border-amber-500/50">
        {isAssassin
          ? 'Choisissez le bon moment pour frapper...'
          : isWolf
            ? 'Mêlez-vous aux villageois et détournez les soupçons...'
            : 'Discutez, partagez vos soupçons et préparez le conseil !'}
      </PhaseHint>

      {/* Rôle : grande carte tant qu'il n'est pas révélé, pilule ensuite */}
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

      {/* Cupidon Lovers Panel (can choose lovers during first day) */}
      {isCupidon && isAlive && (
        <CupidonLoversPanel
          alivePlayers={alivePlayers}
          currentPlayerId={currentPlayerId}
          gameCode={game.code}
          gamePhase={game.current_phase ?? 1}
        />
      )}

      {/* Rappels de discussion : chips légères, sans carte */}
      <div className="flex flex-wrap justify-center gap-2">
        {['🎭 Observez', '🔍 Questionnez', '🤝 Alliez-vous'].map((tip, i) => (
          <motion.span
            key={tip}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium",
              "bg-night-700 border border-white/20 text-moon-100/80",
              "shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
            )}
          >
            {tip}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
