/**
 * SeerPowerPanel - Voyante power usage UI
 * Y2K Sticker aesthetic
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MotionCard, CardHeader, CardTitle, CardContent, MotionButton } from '@/components/ui';
import { PlayerAvatar } from '@/components/game';
import { cn } from '@/lib/utils';
import { getRoleDisplayName, getRoleIcon } from '@/config/roles';
import { SeerHistoryPanel } from './SeerHistoryPanel';
import type { PartialPlayer, SeerResult } from '../hooks/types';

// Helper to format role name with icon
function formatRoleName(roleName: string | undefined): string {
  if (!roleName) return 'Inconnu';
  const icon = getRoleIcon(roleName);
  const displayName = getRoleDisplayName(roleName);
  return `${icon} ${displayName}`;
}

interface SeerPowerPanelProps {
  alivePlayers: PartialPlayer[];
  currentPlayerId: string | null;
  seerTarget: string | null;
  seerResult: SeerResult | null;
  seerHistory: SeerResult[];
  hasUsedSeerPower: boolean;
  isUsingSeerPower: boolean;
  seerError: string | null;
  onSelectTarget: (playerId: string) => void;
  onUsePower: () => void;
}

export function SeerPowerPanel({
  alivePlayers,
  currentPlayerId,
  seerTarget,
  seerResult,
  seerHistory,
  hasUsedSeerPower,
  isUsingSeerPower,
  seerError,
  onSelectTarget,
  onUsePower,
}: SeerPowerPanelProps) {
  // Filter out self
  const targets = alivePlayers.filter(p => p.id !== currentPlayerId);

  return (
    <>
      <MotionCard 
      variant="sticker" 
      rotation={1}
      className="border-village-400/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <CardHeader>
        <CardTitle className="text-village-300 flex items-center gap-2">
          <motion.span
            animate={{ scale: [1, 1.1, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            👁️
          </motion.span>
          Votre don de voyance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {seerResult ? (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ type: 'spring', damping: 15 }}
              className="text-center py-4"
            >
              <motion.p 
                className="text-4xl mb-3"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 1, ease: 'easeOut' }}
              >
                🔮
              </motion.p>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className={cn(
                  'inline-block px-6 py-4 rounded-2xl',
                  'border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]',
                  seerResult.team === 'loups' 
                    ? 'bg-blood-700/50 border-blood-500' 
                    : 'bg-night-700/50 border-village-400'
                )}
              >
                <p className="text-white text-xl font-black mb-2">
                  {seerResult.targetName}
                </p>
                <p className={cn(
                  "text-lg font-bold",
                  seerResult.team === 'loups' ? "text-blood-400" : "text-village-400"
                )}>
                  {formatRoleName(seerResult.roleName)}
                </p>
                <span className={cn(
                  "inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium",
                  "border shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]",
                  seerResult.team === 'loups'
                    ? 'bg-blood-500 border-blood-400 text-white'
                    : 'bg-village-600 border-village-400 text-white'
                )}>
                  Équipe {seerResult.team === 'loups' ? 'Loups' : 'Village'}
                </span>
              </motion.div>
            </motion.div>
          ) : hasUsedSeerPower ? (
            <motion.div 
              key="used"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-4"
            >
              <p className="text-2xl mb-2">✅</p>
              <p className="text-moon-100/70 font-medium">Pouvoir utilisé cette nuit</p>
            </motion.div>
          ) : (
            <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-moon-100/60 text-sm mb-4 text-center">
                Choisissez un joueur pour découvrir son rôle
              </p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {targets.map((player, i) => (
                  <motion.button
                    key={player.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => onSelectTarget(player.id)}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl transition-all",
                      seerTarget === player.id
                        ? "bg-village-400/30 border-2 border-village-400 shadow-[3px_3px_0px_0px_rgba(139,92,246,0.5)]"
                        : "bg-night-800/50 hover:bg-night-700/20 border-2 border-transparent"
                    )}
                  >
                    <div className="relative">
                      <PlayerAvatar
                        playerId={player.id}
                        pseudo={player.pseudo}
                        size="sm"
                      />
                      {seerTarget === player.id && (
                        <motion.span 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={cn(
                            'absolute -top-1 -right-1 px-1.5 py-0.5 text-xs rounded-full',
                            'bg-village-600 border border-white text-white font-bold',
                            'shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]'
                          )}
                        >
                          👁️
                        </motion.span>
                      )}
                    </div>
                    <span className="font-medium text-white text-sm truncate w-full text-center">
                      {player.pseudo}
                    </span>
                  </motion.button>
                ))}
              </div>
              <MotionButton
                variant="sticker"
                className="w-full bg-village-600 border-village-300 hover:bg-village-400"
                onClick={onUsePower}
                disabled={!seerTarget || isUsingSeerPower}
              >
                {isUsingSeerPower ? '⏳ Vision en cours...' : '🔮 Sonder cette âme'}
              </MotionButton>
              <AnimatePresence>
                {seerError && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-blood-400 text-center mt-2"
                  >
                    {seerError}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </MotionCard>

    {/* Seer History - using shared component */}
    <SeerHistoryPanel seerHistory={seerHistory} />
    </>
  );
}
