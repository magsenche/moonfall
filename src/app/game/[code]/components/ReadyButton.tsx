/**
 * ReadyButton - « ✋ Prêt » : écourter la phase quand tout le monde a fini.
 *
 * Pilule flottante (Auto-Garou, joueurs humains vivants). Affiche le compte
 * de prêts — jamais les noms : la nuit, savoir QUI est prêt trahirait les
 * rôles. Quand tous les humains vivants sont prêts, le serveur ramène le
 * timer à 3 s et la partie avance.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Hand } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGame } from '../context';

const POLL_INTERVAL_MS = 5000;

export function ReadyButton() {
  const {
    game,
    gameStatus,
    currentPlayerId,
    isAutoMode,
    isAlive,
    isWolf,
    nightActions,
    voting,
  } = useGame();

  const [readyCount, setReadyCount] = useState(0);
  const [totalHumans, setTotalHumans] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const phase = game.current_phase ?? 1;
  const isSkippablePhase =
    gameStatus === 'nuit' || gameStatus === 'jour' || gameStatus === 'conseil';
  const visible = isAutoMode && isSkippablePhase && isAlive && !!currentPlayerId;

  // Actions obligatoires avant de pouvoir être prêt
  const mustVoteFirst =
    (gameStatus === 'nuit' && isWolf && !nightActions.hasNightVoted) ||
    (gameStatus === 'conseil' && !voting.hasVoted);

  const refresh = useCallback(async () => {
    if (!visible) return;
    try {
      const res = await fetch(`/api/games/${game.code}/ready?playerId=${currentPlayerId}`);
      if (!res.ok) return;
      const data = await res.json();
      setReadyCount(data.readyCount ?? 0);
      setTotalHumans(data.totalHumans ?? 0);
      setIsReady(data.isReady ?? false);
    } catch (err) {
      console.error('Ready status error:', err);
    }
  }, [visible, game.code, currentPlayerId]);

  // Compte à jour au changement de phase + polling léger
  useEffect(() => {
    setHint(null);
    refresh();
    if (!visible) return;
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh, visible, gameStatus, phase]);

  const toggleReady = async () => {
    if (!currentPlayerId || isLoading) return;
    setIsLoading(true);
    setHint(null);
    try {
      const res = await fetch(`/api/games/${game.code}/ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: currentPlayerId, ready: !isReady }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHint(data.error ?? 'Impossible pour le moment');
        return;
      }
      setIsReady(data.isReady);
      setReadyCount(data.readyCount ?? 0);
      setTotalHumans(data.totalHumans ?? 0);
    } catch (err) {
      console.error('Ready toggle error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center safe-area-bottom">
      {hint && (
        <p className="mb-1 px-3 py-1 rounded-full bg-night-800/95 border border-night-600 text-[11px] text-moon-100/80">
          {hint}
        </p>
      )}
      <button
        type="button"
        onClick={toggleReady}
        disabled={isLoading || (mustVoteFirst && !isReady)}
        title={mustVoteFirst && !isReady ? 'Termine ton action de la phase d’abord' : undefined}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-full border-2 font-bold text-sm',
          'shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)] transition-colors',
          isReady
            ? 'bg-village-600 border-village-300 text-white'
            : mustVoteFirst
              ? 'bg-night-800/90 border-night-600 text-moon-100/40'
              : 'bg-night-700/95 border-moon-500/60 text-moon-100'
        )}
      >
        <Hand className="w-4 h-4" />
        {isReady ? 'Prêt·e !' : 'Prêt·e ?'}
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs',
            isReady ? 'bg-village-400/40' : 'bg-night-800/80'
          )}
        >
          {readyCount}/{totalHumans}
        </span>
      </button>
    </div>
  );
}
