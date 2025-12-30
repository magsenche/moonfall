/**
 * TrublionNightPanel - Trublion role swap power during night
 * Swaps the roles of two other players
 * Y2K Sticker aesthetic
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MotionCard, CardHeader, CardTitle, CardContent, MotionButton } from '@/components/ui';
import { PlayerAvatar } from '@/components/game';
import { cn } from '@/lib/utils';
import type { PartialPlayer } from '../hooks/types';

interface TrublionNightPanelProps {
  alivePlayers: PartialPlayer[];
  currentPlayerId: string | null;
  gameCode: string;
  gamePhase: number;
}

interface TrublionStatus {
  hasUsedPower: boolean;
  player1Name: string | null;
  player2Name: string | null;
}

export function TrublionNightPanel({
  alivePlayers,
  currentPlayerId,
  gameCode,
  gamePhase,
}: TrublionNightPanelProps) {
  const [status, setStatus] = useState<TrublionStatus>({
    hasUsedPower: false,
    player1Name: null,
    player2Name: null,
  });
  const [target1, setTarget1] = useState<string | null>(null);
  const [target2, setTarget2] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch status on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(
          `/api/games/${gameCode}/power/trublion?playerId=${currentPlayerId}`
        );
        if (response.ok) {
          const data = await response.json();
          setStatus({
            hasUsedPower: data.hasUsedPower,
            player1Name: data.player1Name,
            player2Name: data.player2Name,
          });
        }
      } catch (err) {
        console.error('Error fetching trublion status:', err);
      }
    };

    if (currentPlayerId) {
      fetchStatus();
    }
  }, [gameCode, currentPlayerId, gamePhase]);

  const swapRoles = async () => {
    if (!target1 || !target2 || status.hasUsedPower) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/${gameCode}/power/trublion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: currentPlayerId,
          target1Id: target1,
          target2Id: target2,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'échange");
      }

      const name1 = alivePlayers.find(p => p.id === target1)?.pseudo;
      const name2 = alivePlayers.find(p => p.id === target2)?.pseudo;
      setStatus({
        hasUsedPower: true,
        player1Name: name1 || null,
        player2Name: name2 || null,
      });
      setSuccessMessage(`🔀 ${name1} et ${name2} ont échangé leurs rôles !`);
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

  const target1Name = alivePlayers.find(p => p.id === target1)?.pseudo;
  const target2Name = alivePlayers.find(p => p.id === target2)?.pseudo;

  const handleTargetClick = (playerId: string) => {
    if (target1 === playerId) {
      setTarget1(null);
    } else if (target2 === playerId) {
      setTarget2(null);
    } else if (!target1) {
      setTarget1(playerId);
    } else if (!target2) {
      setTarget2(playerId);
    } else {
      // Both selected, replace the first one
      setTarget1(playerId);
    }
  };

  const getTargetState = (playerId: string) => {
    if (target1 === playerId) return 1;
    if (target2 === playerId) return 2;
    return 0;
  };

  return (
    <MotionCard
      variant="sticker"
      rotation={-1.5}
      className="mb-6 border-violet-500/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <CardHeader>
        <CardTitle className="text-violet-400 flex items-center gap-2">
          <motion.span
            animate={{ rotate: [0, 180, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            🔀
          </motion.span>
          Pouvoir du Trublion
          <span className="ml-auto text-xs text-violet-300/60 font-normal">
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
              <motion.div
                className="text-5xl mb-3 flex justify-center gap-2"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span>🎭</span>
                <span>↔️</span>
                <span>🎭</span>
              </motion.div>
              <p className="text-violet-400 font-bold text-lg mb-2">
                {successMessage ||
                  `${status.player1Name} ↔️ ${status.player2Name}`}
              </p>
              <p className="text-slate-400 text-sm">
                Les deux joueurs ont secrètement échangé leurs rôles !
              </p>
              <p className="text-amber-400/80 text-xs mt-4">
                🤫 Personne ne le sait à part vous...
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
                🔀
              </motion.p>
              <p className="text-white font-bold text-lg mb-2">
                Échanger les rôles ?
              </p>
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="px-3 py-1 bg-violet-500/30 rounded-full text-violet-300">
                  {target1Name}
                </span>
                <motion.span
                  animate={{ x: [-5, 5, -5] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  ↔️
                </motion.span>
                <span className="px-3 py-1 bg-violet-500/30 rounded-full text-violet-300">
                  {target2Name}
                </span>
              </div>
              <p className="text-violet-400 text-sm mb-6">
                Cette action est définitive !
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
                  onClick={swapRoles}
                  disabled={isLoading}
                  className="bg-violet-600 hover:bg-violet-500 border-violet-400"
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
                    '🔀 Confirmer'
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
              <p className="text-slate-400 text-sm mb-2 text-center">
                Choisissez 2 joueurs dont les rôles seront échangés
              </p>
              <p className="text-violet-400/80 text-xs mb-4 text-center">
                🎭 Ils ne le sauront pas !
              </p>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {validTargets.map((player, i) => {
                  const state = getTargetState(player.id);
                  return (
                    <motion.button
                      key={player.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => handleTargetClick(player.id)}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3 rounded-xl transition-all relative',
                        state > 0
                          ? 'bg-violet-500/30 border-2 border-violet-500 shadow-[3px_3px_0px_0px_rgba(139,92,246,0.5)]'
                          : 'bg-zinc-800/50 hover:bg-violet-900/20 border-2 border-transparent'
                      )}
                    >
                      {state > 0 && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center border-2 border-violet-300">
                          {state}
                        </div>
                      )}
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
                  );
                })}
              </div>

              {target1 && target2 && (
                <div className="flex items-center justify-center gap-2 mb-4 text-sm">
                  <span className="text-violet-300">{target1Name}</span>
                  <motion.span
                    animate={{ x: [-3, 3, -3] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  >
                    ↔️
                  </motion.span>
                  <span className="text-violet-300">{target2Name}</span>
                </div>
              )}

              <MotionButton
                variant="sticker"
                onClick={() => target1 && target2 && setShowConfirm(true)}
                disabled={!target1 || !target2}
                className="w-full bg-violet-600 hover:bg-violet-500 border-violet-400"
                whileTap={{ scale: 0.98 }}
              >
                <span className="flex items-center gap-2">
                  🔀 Échanger les rôles
                </span>
              </MotionButton>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </MotionCard>
  );
}
