/**
 * AvatarPicker - Choisis ton avatar dans le lobby (façon Kahoot).
 *
 * Grille d'emojis (AVATAR_CHOICES) ; le choix est stocké dans
 * players.avatar_url et apparaît chez tout le monde via le realtime.
 * Y2K Sticker aesthetic.
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MotionCard, CardContent } from '@/components/ui';
import { AVATAR_CHOICES, getAvatarFor } from '@/config/players';
import { cn } from '@/lib/utils';

interface AvatarPickerProps {
  gameCode: string;
  playerId: string;
}

export function AvatarPicker({ gameCode, playerId }: AvatarPickerProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = chosen ?? getAvatarFor(playerId);

  const pick = async (avatar: string) => {
    if (pending) return;
    setPending(avatar);
    setError(null);
    try {
      const res = await fetch(`/api/games/${gameCode}/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, avatar }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Impossible de changer d'avatar");
      }
      setChosen(avatar);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setPending(null);
    }
  };

  return (
    <MotionCard variant="sticker" rotation={0.7} className="mt-4">
      <CardContent className="pt-4 pb-4">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center justify-between w-full"
        >
          <span className="flex items-center gap-3">
            <span
              className={cn(
                'w-11 h-11 rounded-full flex items-center justify-center text-2xl',
                'border-2 border-white bg-night-700',
                'shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]'
              )}
            >
              {current}
            </span>
            <span className="text-sm font-bold text-moon-100/80">Ton avatar</span>
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
              <div className="grid grid-cols-8 gap-2 pt-4">
                {AVATAR_CHOICES.map((avatar) => (
                  <motion.button
                    key={avatar}
                    type="button"
                    whileTap={{ scale: 0.85 }}
                    onClick={() => pick(avatar)}
                    disabled={pending !== null}
                    className={cn(
                      'aspect-square rounded-xl flex items-center justify-center text-xl',
                      'border-2 transition-colors',
                      current === avatar
                        ? 'border-village-400 bg-village-600/30'
                        : 'border-night-600 bg-night-800/60 hover:border-night-500',
                      pending === avatar && 'animate-pulse'
                    )}
                  >
                    {avatar}
                  </motion.button>
                ))}
              </div>
              {error && <p className="text-xs text-blood-400 mt-2">{error}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </MotionCard>
  );
}
