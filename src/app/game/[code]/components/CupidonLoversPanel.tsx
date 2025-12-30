/**
 * CupidonLoversPanel - Cupidon lover selection at game start
 * Shows during the first night or day to select two players as lovers
 * Y2K Sticker aesthetic
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MotionCard, CardHeader, CardTitle, CardContent, MotionButton } from '@/components/ui';
import { PlayerAvatar } from '@/components/game';
import { cn } from '@/lib/utils';
import type { PartialPlayer } from '../hooks/types';

interface CupidonLoversPanelProps {
  alivePlayers: PartialPlayer[];
  currentPlayerId: string | null;
  gameCode: string;
  gamePhase: number;
}

interface LoversStatus {
  hasChosenLovers: boolean;
  lover1Id: string | null;
  lover1Name: string | null;
  lover2Id: string | null;
  lover2Name: string | null;
  isLover: boolean;
  partnerPlayerId: string | null;
  partnerPlayerName: string | null;
}

export function CupidonLoversPanel({
  alivePlayers,
  currentPlayerId,
  gameCode,
  gamePhase,
}: CupidonLoversPanelProps) {
  const [status, setStatus] = useState<LoversStatus>({
    hasChosenLovers: false,
    lover1Id: null,
    lover1Name: null,
    lover2Id: null,
    lover2Name: null,
    isLover: false,
    partnerPlayerId: null,
    partnerPlayerName: null,
  });
  const [selectedLover1, setSelectedLover1] = useState<string | null>(null);
  const [selectedLover2, setSelectedLover2] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch status on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(
          `/api/games/${gameCode}/power/cupidon?playerId=${currentPlayerId}`
        );
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (err) {
        console.error('Error fetching cupidon status:', err);
      }
    };

    if (currentPlayerId) {
      fetchStatus();
    }
  }, [gameCode, currentPlayerId, gamePhase]);

  const chooseLovers = async () => {
    if (!selectedLover1 || !selectedLover2 || status.hasChosenLovers) return;

    if (selectedLover1 === selectedLover2) {
      setError('Tu dois choisir deux joueurs différents !');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/${gameCode}/power/cupidon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: currentPlayerId,
          lover1Id: selectedLover1,
          lover2Id: selectedLover2,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du choix des amoureux');
      }

      const lover1Name = alivePlayers.find(p => p.id === selectedLover1)?.pseudo;
      const lover2Name = alivePlayers.find(p => p.id === selectedLover2)?.pseudo;
      
      setStatus({
        hasChosenLovers: true,
        lover1Id: selectedLover1,
        lover1Name: lover1Name || null,
        lover2Id: selectedLover2,
        lover2Name: lover2Name || null,
        isLover: selectedLover1 === currentPlayerId || selectedLover2 === currentPlayerId,
        partnerPlayerId: selectedLover1 === currentPlayerId 
          ? selectedLover2 
          : selectedLover2 === currentPlayerId 
            ? selectedLover1 
            : null,
        partnerPlayerName: selectedLover1 === currentPlayerId 
          ? lover2Name || null 
          : selectedLover2 === currentPlayerId 
            ? lover1Name || null 
            : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter targets (can choose anyone including self, except MJ)
  const validTargets = alivePlayers.filter(p => !p.is_mj);

  // If already chosen lovers, show confirmation
  if (status.hasChosenLovers) {
    return (
      <MotionCard
        variant="sticker"
        rotation={1}
        className="mb-6 border-pink-500/50"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <CardHeader>
          <CardTitle className="text-pink-400 flex items-center gap-2">
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              💘
            </motion.span>
            Amoureux liés !
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-4">
          <div className="flex justify-center items-center gap-4 mb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10, delay: 0.1 }}
              className="flex flex-col items-center"
            >
              <span className="text-4xl mb-1">💕</span>
              <span className="font-bold text-pink-300">{status.lover1Name}</span>
            </motion.div>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10, delay: 0.3 }}
              className="text-3xl"
            >
              ❤️
            </motion.span>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10, delay: 0.1 }}
              className="flex flex-col items-center"
            >
              <span className="text-4xl mb-1">💕</span>
              <span className="font-bold text-pink-300">{status.lover2Name}</span>
            </motion.div>
          </div>
          <p className="text-slate-400 text-sm">
            Ils sont maintenant liés par l&apos;amour... et par le destin.
            <br />
            Si l&apos;un meurt, l&apos;autre mourra de chagrin.
          </p>
        </CardContent>
      </MotionCard>
    );
  }

  return (
    <MotionCard
      variant="sticker"
      rotation={1}
      className="mb-6 border-pink-500/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <CardHeader>
        <CardTitle className="text-pink-400 flex items-center gap-2">
          <motion.span
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            💘
          </motion.span>
          Pouvoir de Cupidon
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-slate-300 text-sm text-center">
          Choisis deux joueurs qui deviendront <span className="text-pink-400 font-bold">Amoureux</span>.
          <br />
          Tu peux te choisir toi-même !
        </p>

        {/* First lover selection */}
        <div>
          <p className="text-pink-300 text-sm font-medium mb-2">💕 Premier amoureux :</p>
          <div className="grid grid-cols-3 gap-2">
            <AnimatePresence mode="popLayout">
              {validTargets.map((player) => (
                <motion.button
                  key={player.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  disabled={isLoading || player.id === selectedLover2}
                  onClick={() => setSelectedLover1(player.id)}
                  className={cn(
                    'p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1',
                    'disabled:opacity-30 disabled:cursor-not-allowed',
                    selectedLover1 === player.id
                      ? 'border-pink-500 bg-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.4)]'
                      : 'border-white/20 hover:border-pink-500/50 bg-zinc-800/50'
                  )}
                >
                  <PlayerAvatar playerId={player.id} pseudo={player.pseudo} size="sm" />
                  <span className="text-xs text-white font-medium truncate max-w-full">
                    {player.pseudo}
                  </span>
                  {selectedLover1 === player.id && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-pink-400"
                    >
                      💕
                    </motion.span>
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Second lover selection */}
        <div>
          <p className="text-pink-300 text-sm font-medium mb-2">💕 Deuxième amoureux :</p>
          <div className="grid grid-cols-3 gap-2">
            <AnimatePresence mode="popLayout">
              {validTargets.map((player) => (
                <motion.button
                  key={player.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  disabled={isLoading || player.id === selectedLover1}
                  onClick={() => setSelectedLover2(player.id)}
                  className={cn(
                    'p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1',
                    'disabled:opacity-30 disabled:cursor-not-allowed',
                    selectedLover2 === player.id
                      ? 'border-pink-500 bg-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.4)]'
                      : 'border-white/20 hover:border-pink-500/50 bg-zinc-800/50'
                  )}
                >
                  <PlayerAvatar playerId={player.id} pseudo={player.pseudo} size="sm" />
                  <span className="text-xs text-white font-medium truncate max-w-full">
                    {player.pseudo}
                  </span>
                  {selectedLover2 === player.id && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-pink-400"
                    >
                      💕
                    </motion.span>
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Preview */}
        {selectedLover1 && selectedLover2 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-2 px-4 bg-pink-500/10 rounded-xl border border-pink-500/30"
          >
            <span className="text-pink-300 text-sm">
              {validTargets.find(p => p.id === selectedLover1)?.pseudo}
              {' '}❤️{' '}
              {validTargets.find(p => p.id === selectedLover2)?.pseudo}
            </span>
          </motion.div>
        )}

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-400 text-sm text-center"
          >
            ⚠️ {error}
          </motion.p>
        )}

        <MotionButton
          variant="sticker"
          onClick={chooseLovers}
          disabled={!selectedLover1 || !selectedLover2 || isLoading}
          className={cn(
            'w-full',
            selectedLover1 && selectedLover2
              ? 'bg-pink-500/20 border-pink-500 text-pink-300 hover:bg-pink-500/30'
              : ''
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                💘
              </motion.span>
              {' '}Création du lien...
            </>
          ) : (
            <>💘 Lier les amoureux</>
          )}
        </MotionButton>
      </CardContent>
    </MotionCard>
  );
}

/**
 * LoverStatusBadge - Shows lover status for a player who is in love
 * Displays who their partner is
 */
interface LoverStatusBadgeProps {
  gameCode: string;
  currentPlayerId: string | null;
}

export function LoverStatusBadge({ gameCode, currentPlayerId }: LoverStatusBadgeProps) {
  const [status, setStatus] = useState<LoversStatus | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(
          `/api/games/${gameCode}/power/cupidon?playerId=${currentPlayerId}`
        );
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (err) {
        console.error('Error fetching lover status:', err);
      }
    };

    if (currentPlayerId) {
      fetchStatus();
    }
  }, [gameCode, currentPlayerId]);

  if (!status?.isLover) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-pink-500/20 border border-pink-500/40 rounded-full"
    >
      <motion.span
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        💕
      </motion.span>
      <span className="text-pink-300 text-sm font-medium">
        Amoureux de {status.partnerPlayerName}
      </span>
    </motion.div>
  );
}
