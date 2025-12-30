/**
 * AssassinPowerPanel - Assassin kill power (Solo role)
 * Can be used during day or night, once per game
 * Y2K Sticker aesthetic
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MotionCard, CardHeader, CardTitle, CardContent, MotionButton } from '@/components/ui';
import { PlayerAvatar } from '@/components/game';
import { cn } from '@/lib/utils';
import type { PartialPlayer } from '../hooks/types';

interface AssassinPowerPanelProps {
  alivePlayers: PartialPlayer[];
  currentPlayerId: string | null;
  gameCode: string;
  gamePhase: number;
}

interface AssassinStatus {
  hasUsedPower: boolean;
  victimId: string | null;
  victimName: string | null;
}

export function AssassinPowerPanel({
  alivePlayers,
  currentPlayerId,
  gameCode,
  gamePhase,
}: AssassinPowerPanelProps) {
  const [status, setStatus] = useState<AssassinStatus>({
    hasUsedPower: false,
    victimId: null,
    victimName: null,
  });
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch status on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(
          `/api/games/${gameCode}/power/assassin?playerId=${currentPlayerId}`
        );
        if (response.ok) {
          const data = await response.json();
          setStatus({
            hasUsedPower: data.hasUsedPower,
            victimId: data.victimId,
            victimName: data.victimName,
          });
        }
      } catch (err) {
        console.error('Error fetching assassin status:', err);
      }
    };

    if (currentPlayerId) {
      fetchStatus();
    }
  }, [gameCode, currentPlayerId, gamePhase]);

  const assassinatePlayer = async () => {
    if (!selectedTarget || status.hasUsedPower) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/${gameCode}/power/assassin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: currentPlayerId,
          targetId: selectedTarget,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'assassinat");
      }

      const targetName = alivePlayers.find(p => p.id === selectedTarget)?.pseudo;
      setStatus({
        hasUsedPower: true,
        victimId: selectedTarget,
        victimName: targetName || null,
      });
      setSuccessMessage(`🗡️ ${targetName} a été assassiné(e) !`);
      setShowConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter targets (can't target self)
  const validTargets = alivePlayers.filter(
    p => p.id !== currentPlayerId && !p.is_mj
  );

  const targetName = alivePlayers.find(p => p.id === selectedTarget)?.pseudo;

  return (
    <MotionCard
      variant="sticker"
      rotation={1.5}
      className="mb-6 border-rose-500/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <CardHeader>
        <CardTitle className="text-rose-400 flex items-center gap-2">
          <motion.span
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🗡️
          </motion.span>
          Pouvoir de l'Assassin
          <span className="ml-auto text-xs text-rose-300/60 font-normal">
            1x par partie
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-3 mb-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {status.hasUsedPower ? (
            <motion.div
              key="used"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6"
            >
              <p className="text-3xl mb-3">⚰️</p>
              <p className="text-rose-400 font-bold text-lg mb-2">
                {successMessage || `Vous avez assassiné ${status.victimName}`}
              </p>
              <p className="text-slate-400 text-sm">
                Votre lame a trouvé sa cible. Il ne vous reste plus qu'à survivre...
              </p>
              <p className="text-amber-400 text-xs mt-4">
                🎯 Objectif : Être le dernier survivant
              </p>
            </motion.div>
          ) : showConfirm ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <motion.p
                className="text-5xl mb-4"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                ⚠️
              </motion.p>
              <p className="text-white font-bold text-lg mb-2">
                Assassiner {targetName} ?
              </p>
              <p className="text-rose-400 text-sm mb-6">
                Cette action est définitive et révèlera votre nature.
              </p>
              <div className="flex gap-3 justify-center">
                <MotionButton
                  variant="sticker"
                  onClick={() => setShowConfirm(false)}
                  className="bg-slate-700 hover:bg-slate-600 border-slate-500"
                  whileTap={{ scale: 0.95 }}
                >
                  Annuler
                </MotionButton>
                <MotionButton
                  variant="sticker"
                  onClick={assassinatePlayer}
                  disabled={isLoading}
                  className="bg-rose-600 hover:bg-rose-500 border-rose-400"
                  whileTap={{ scale: 0.95 }}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        ⏳
                      </motion.span>
                      ...
                    </span>
                  ) : (
                    '🗡️ Confirmer'
                  )}
                </MotionButton>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="p-3 mb-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-amber-400 text-sm text-center">
                  🎯 Vous jouez seul. Éliminez tout le monde pour gagner !
                </p>
              </div>

              <p className="text-slate-400 text-sm mb-4 text-center">
                Choisissez votre victime (mort immédiate)
              </p>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {validTargets.map((player, i) => (
                  <motion.button
                    key={player.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedTarget(player.id)}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-xl transition-all',
                      selectedTarget === player.id
                        ? 'bg-rose-500/30 border-2 border-rose-500 shadow-[3px_3px_0px_0px_rgba(244,63,94,0.5)]'
                        : 'bg-zinc-800/50 hover:bg-rose-900/20 border-2 border-transparent'
                    )}
                  >
                    <PlayerAvatar
                      playerId={player.id}
                      pseudo={player.pseudo}
                      isAlive={player.is_alive ?? true}
                      size="md"
                    />
                    <span className="text-sm text-white font-medium truncate max-w-full">
                      {player.pseudo}
                    </span>
                  </motion.button>
                ))}
              </div>

              <MotionButton
                variant="sticker"
                onClick={() => selectedTarget && setShowConfirm(true)}
                disabled={!selectedTarget}
                className="w-full bg-rose-600 hover:bg-rose-500 border-rose-400"
                whileTap={{ scale: 0.98 }}
              >
                <span className="flex items-center gap-2">
                  🗡️ Préparer l'assassinat
                </span>
              </MotionButton>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </MotionCard>
  );
}
