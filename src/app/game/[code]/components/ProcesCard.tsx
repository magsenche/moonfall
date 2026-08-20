/**
 * ProcesCard - Le procès d'avant-partie au lobby.
 *
 * Avant même la distribution des rôles, chacun accuse en secret la « tête de
 * traître » du groupe. Personne ne voit qui accuse qui : seul le nombre
 * d'accusations déposées s'affiche. Le verdict (« Délit de faciès ») tombe au
 * récap de fin, une fois les rôles révélés.
 */

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale } from 'lucide-react';
import { MotionCard, CardContent } from '@/components/ui';
import { getAvatarFor } from '@/config/players';
import { cn } from '@/lib/utils';
import type { PartialPlayer } from '../hooks/types';

interface ProcesCardProps {
  gameCode: string;
  playerId: string;
  /** Cibles accusables (le MJ arbitre est déjà exclu par le parent) */
  players: PartialPlayer[];
}

export function ProcesCard({ gameCode, playerId, players }: ProcesCardProps) {
  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Restauration + rafraîchissement du compteur quand le lobby bouge
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/games/${gameCode}/proces?playerId=${playerId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setCount(data.count ?? 0);
        setTargetId(data.targetId ?? null);
      })
      .catch(() => {
        // Compteur purement décoratif : un échec de lecture n'affiche rien
      });
    return () => {
      cancelled = true;
    };
  }, [gameCode, playerId, players.length]);

  const accuse = async (accusedId: string) => {
    if (pending) return;
    setPending(accusedId);
    setError(null);
    try {
      const res = await fetch(`/api/games/${gameCode}/proces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, targetId: accusedId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Impossible de déposer l'accusation");
      }
      if (targetId === null) setCount((c) => c + 1);
      setTargetId(accusedId);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setPending(null);
    }
  };

  const targets = players.filter((p) => p.id !== playerId);
  if (targets.length < 2) return null;

  return (
    <MotionCard variant="sticker" rotation={-0.6} className="mt-4">
      <CardContent className="pt-4 pb-4">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center justify-between w-full"
        >
          <span className="flex items-center gap-3">
            <span
              className={cn(
                'w-11 h-11 rounded-full flex items-center justify-center',
                'border-2 border-white bg-night-700',
                'shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]'
              )}
            >
              <Scale className="w-5 h-5 text-moon-300" />
            </span>
            <span className="text-left">
              <span className="block text-sm font-bold text-moon-100/80">
                {targetId ? 'Accusation déposée' : 'Qui a une tête de traître ?'}
              </span>
              <span className="block text-xs text-moon-100/50">
                {count > 0
                  ? `${count} accusation${count > 1 ? 's' : ''} au procès — verdict en fin de partie`
                  : 'Accuse en secret, verdict en fin de partie'}
              </span>
            </span>
          </span>
          <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-moon-100/60">
            ▼
          </motion.span>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-4">
                {targets.map((player) => (
                  <motion.button
                    key={player.id}
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => accuse(player.id)}
                    disabled={pending !== null}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-xl',
                      'border-2 transition-colors',
                      targetId === player.id
                        ? 'border-blood-400 bg-blood-600/20'
                        : 'border-night-600 bg-night-800/60 hover:border-night-500',
                      pending === player.id && 'animate-pulse'
                    )}
                  >
                    <span className="text-2xl select-none">{getAvatarFor(player.id)}</span>
                    <span className="text-[11px] font-bold text-white truncate max-w-full">
                      {player.pseudo}
                    </span>
                  </motion.button>
                ))}
              </div>
              <p className="text-[11px] text-moon-100/40 mt-3">
                Ton accusation reste secrète et ne change rien à la partie : on
                verra au récap qui avait vraiment une tête de traître.
              </p>
              {error && <p className="text-xs text-blood-400 mt-2">{error}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </MotionCard>
  );
}
