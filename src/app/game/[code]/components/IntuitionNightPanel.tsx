/**
 * IntuitionNightPanel - L'action de nuit des joueurs sans pouvoir.
 *
 * Chaque non-loup désigne en secret qui il soupçonne. Sans effet sur la
 * partie — mais tous les téléphones sont actifs la nuit (sinon, celui qui
 * tapote se trahit) et le récap final révèle qui avait du flair.
 * Y2K Sticker aesthetic.
 */

'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MotionCard, CardHeader, CardTitle, CardContent, MotionButton } from '@/components/ui';
import { PlayerAvatar } from '@/components/game';
import { cn } from '@/lib/utils';
import type { PartialPlayer } from '../hooks/types';

interface IntuitionNightPanelProps {
  alivePlayers: PartialPlayer[];
  currentPlayerId: string | null;
  gameCode: string;
  gamePhase: number;
}

export function IntuitionNightPanel({
  alivePlayers,
  currentPlayerId,
  gameCode,
  gamePhase,
}: IntuitionNightPanelProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [confirmedTarget, setConfirmedTarget] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restaure l'intuition déjà confiée cette nuit (rafraîchissement d'écran)
  useEffect(() => {
    if (!currentPlayerId) return;
    setSelectedTarget(null);
    setConfirmedTarget(null);
    fetch(`/api/games/${gameCode}/night-action?playerId=${currentPlayerId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.targetId) {
          setSelectedTarget(data.targetId);
          setConfirmedTarget(data.targetId);
        }
      })
      .catch((err) => console.error('Intuition status error:', err));
  }, [gameCode, currentPlayerId, gamePhase]);

  const submitIntuition = async () => {
    if (!selectedTarget || !currentPlayerId) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/games/${gameCode}/night-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: currentPlayerId, targetId: selectedTarget }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'envoi de l'intuition");
      }
      setConfirmedTarget(selectedTarget);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  const targets = alivePlayers.filter((p) => p.id !== currentPlayerId);
  const confirmedName = alivePlayers.find((p) => p.id === confirmedTarget)?.pseudo;

  return (
    <MotionCard
      variant="sticker"
      rotation={0.5}
      className="border-village-400/40"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span>🔮</span>
          <span>Ton intuition de la nuit</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-moon-100/50 mb-3">
          Qui soupçonnes-tu cette nuit ? Personne ne le saura… jusqu&apos;au récap de fin
          de partie.
        </p>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
          {targets.map((player) => (
            <motion.button
              key={player.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedTarget(player.id)}
              className={cn(
                'flex flex-col items-center p-2 rounded-xl border-2 transition-colors',
                selectedTarget === player.id
                  ? 'border-village-400 bg-village-600/30'
                  : 'border-night-600 bg-night-800/60 hover:border-night-500'
              )}
            >
              <PlayerAvatar playerId={player.id} pseudo={player.pseudo} size="sm" />
              <span className="mt-1 text-[10px] font-bold text-white truncate max-w-full">
                {player.pseudo}
              </span>
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {confirmedTarget && confirmedTarget === selectedTarget ? (
            <motion.p
              key="confirmed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-sm text-village-300 text-center font-medium"
            >
              🤫 Intuition confiée : {confirmedName}. Tu peux encore changer d&apos;avis.
            </motion.p>
          ) : (
            <MotionButton
              key="submit"
              variant="sticker"
              className="w-full bg-village-600 border-village-400"
              onClick={submitIntuition}
              disabled={!selectedTarget || isLoading}
            >
              {isLoading ? '...' : '🔮 Confier mon intuition'}
            </MotionButton>
          )}
        </AnimatePresence>

        {error && <p className="text-sm text-blood-400 text-center mt-2">{error}</p>}
      </CardContent>
    </MotionCard>
  );
}
