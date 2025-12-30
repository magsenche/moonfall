/**
 * SalvateurNightPanel - Salvateur protection power during night
 * Y2K Sticker aesthetic
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MotionCard, CardHeader, CardTitle, CardContent, MotionButton } from '@/components/ui';
import { PlayerAvatar } from '@/components/game';
import { cn } from '@/lib/utils';
import type { PartialPlayer } from '../hooks/types';

interface SalvateurNightPanelProps {
  alivePlayers: PartialPlayer[];
  currentPlayerId: string | null;
  gameCode: string;
  gamePhase: number;
}

interface SalvateurStatus {
  hasProtectedThisNight: boolean;
  protectedPlayerId: string | null;
  lastProtectedPlayerId: string | null;
}

export function SalvateurNightPanel({
  alivePlayers,
  currentPlayerId,
  gameCode,
  gamePhase,
}: SalvateurNightPanelProps) {
  const [status, setStatus] = useState<SalvateurStatus>({
    hasProtectedThisNight: false,
    protectedPlayerId: null,
    lastProtectedPlayerId: null,
  });
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch status on mount and phase change
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(
          `/api/games/${gameCode}/power/salvateur?playerId=${currentPlayerId}`
        );
        if (response.ok) {
          const data = await response.json();
          setStatus({
            hasProtectedThisNight: data.hasProtectedThisNight,
            protectedPlayerId: data.protectedPlayerId,
            lastProtectedPlayerId: data.lastProtectedPlayerId,
          });
          if (data.protectedPlayerId) {
            setSelectedTarget(data.protectedPlayerId);
          }
        }
      } catch (err) {
        console.error('Error fetching salvateur status:', err);
      }
    };

    if (currentPlayerId) {
      fetchStatus();
    }
  }, [gameCode, currentPlayerId, gamePhase]);

  const protectPlayer = async () => {
    if (!selectedTarget || status.hasProtectedThisNight) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/${gameCode}/power/salvateur`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: currentPlayerId,
          targetId: selectedTarget,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la protection');
      }

      const targetName = alivePlayers.find(p => p.id === selectedTarget)?.pseudo;
      setStatus(prev => ({
        ...prev,
        hasProtectedThisNight: true,
        protectedPlayerId: selectedTarget,
      }));
      setSuccessMessage(`🛡️ ${targetName} est protégé(e) cette nuit !`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter targets (can't protect same person twice in a row)
  const validTargets = alivePlayers.filter(
    p => p.id !== status.lastProtectedPlayerId && !p.is_mj
  );

  const protectedPlayerName = alivePlayers.find(
    p => p.id === status.protectedPlayerId
  )?.pseudo;

  return (
    <MotionCard
      variant="sticker"
      rotation={-1}
      className="mb-6 border-cyan-500/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <CardHeader>
        <CardTitle className="text-cyan-400 flex items-center gap-2">
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            🛡️
          </motion.span>
          Protection du Salvateur
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-3 mb-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {status.hasProtectedThisNight ? (
            <motion.div
              key="protected"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6"
            >
              <motion.p
                className="text-5xl mb-3"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🛡️
              </motion.p>
              <p className="text-cyan-400 font-bold text-lg mb-2">
                {successMessage || `${protectedPlayerName} est protégé(e)`}
              </p>
              <p className="text-slate-400 text-sm">
                Si les loups l'attaquent, il/elle survivra.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-slate-400 text-sm mb-4 text-center">
                Choisissez un joueur à protéger cette nuit
              </p>

              {status.lastProtectedPlayerId && (
                <p className="text-amber-400/80 text-xs mb-4 text-center">
                  ⚠️ Vous ne pouvez pas protéger la même personne deux nuits de suite
                </p>
              )}

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
                        ? 'bg-cyan-500/30 border-2 border-cyan-500 shadow-[3px_3px_0px_0px_rgba(34,211,238,0.5)]'
                        : 'bg-zinc-800/50 hover:bg-cyan-900/20 border-2 border-transparent'
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
                    {player.id === currentPlayerId && (
                      <span className="text-xs text-cyan-400">(vous)</span>
                    )}
                  </motion.button>
                ))}
              </div>

              <MotionButton
                variant="sticker"
                onClick={protectPlayer}
                disabled={!selectedTarget || isLoading}
                className="w-full bg-cyan-600 hover:bg-cyan-500 border-cyan-400"
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      ⏳
                    </motion.span>
                    Protection en cours...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    🛡️ Protéger ce joueur
                  </span>
                )}
              </MotionButton>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </MotionCard>
  );
}
