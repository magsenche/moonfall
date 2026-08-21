/**
 * PhaseCurtain - Le rideau de narration entre les phases.
 *
 * À chaque changement de phase, un rideau plein écran tombe et raconte ce qui
 * vient de se passer, comme le ferait un MJ : la nuit tombe, le village se
 * réveille (et découvre ses morts), le conseil s'ouvre. Les lignes viennent
 * de GET /narration (composées serveur depuis les game_events — identiques
 * sur tous les téléphones).
 *
 * Tap pour passer ; disparaît seul après quelques secondes.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { playNarratorCue } from '@/lib/sounds';
import { useGame } from '../context';

const CURTAIN_MS = 6500;

const PHASE_STYLES: Record<string, { bg: string; emoji: string; title: string }> = {
  nuit: {
    bg: 'from-[#0a0d1f] via-night-950 to-black',
    emoji: '🌙',
    title: 'La nuit tombe',
  },
  jour: {
    bg: 'from-[#2b1d0a] via-night-950 to-black',
    emoji: '☀️',
    title: 'Le jour se lève',
  },
  conseil: {
    bg: 'from-[#26090b] via-night-950 to-black',
    emoji: '⚖️',
    title: 'Le conseil',
  },
};

export function PhaseCurtain() {
  const { game, gameStatus } = useGame();
  const previousStatusRef = useRef<string | null>(null);
  const [curtain, setCurtain] = useState<{
    status: string;
    lines: string[];
    narrator: { id: string; name: string; tagline: string; emoji: string } | null;
    isIntro: boolean;
  } | null>(null);

  // À chaque transition de phase (pas au premier montage : on arrive peut-être
  // en cours de partie), le rideau tombe avec la narration du moment
  useEffect(() => {
    const previous = previousStatusRef.current;
    previousStatusRef.current = gameStatus;
    if (previous === null || previous === gameStatus) return;
    if (gameStatus !== 'nuit' && gameStatus !== 'jour' && gameStatus !== 'conseil') return;

    let cancelled = false;
    fetch(`/api/games/${game.code}/narration`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data || data.status !== gameStatus) return;
        const isIntro = gameStatus === 'nuit' && data.phase === 1;
        setCurtain({
          status: gameStatus,
          lines: data.lines ?? [],
          narrator: data.narrator ?? null,
          isIntro,
        });
        // Entrée en scène : le motif sonore du narrateur, après le jingle de
        // phase (SoundEffects) pour ne pas se marcher dessus
        if (isIntro && data.narrator?.id) {
          setTimeout(() => playNarratorCue(data.narrator.id), 1200);
        }
      })
      .catch(() => {
        // Narration décorative : sans réseau, pas de rideau
      });
    return () => {
      cancelled = true;
    };
  }, [gameStatus, game.code]);

  // Le rideau se lève tout seul — un peu plus tard à l'entrée en scène du
  // narrateur (nuit 1), le temps de lire sa présentation
  useEffect(() => {
    if (!curtain) return;
    const timeout = setTimeout(() => setCurtain(null), curtain.isIntro ? CURTAIN_MS + 3000 : CURTAIN_MS);
    return () => clearTimeout(timeout);
  }, [curtain]);

  const style = curtain ? (PHASE_STYLES[curtain.status] ?? PHASE_STYLES.nuit) : null;

  return (
    <AnimatePresence>
      {curtain && style && (
        <motion.button
          type="button"
          aria-label="Passer la narration"
          onClick={() => setCurtain(null)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
          className={cn(
            'fixed inset-0 z-[70] w-full cursor-pointer',
            'flex flex-col items-center justify-center px-8 text-center',
            'bg-gradient-to-b',
            style.bg
          )}
        >
          <motion.p
            className="text-6xl mb-6"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 120 }}
          >
            {style.emoji}
          </motion.p>

          <div className="space-y-5 max-w-sm">
            {curtain.lines.map((line, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 1.1, duration: 0.7 }}
                className={cn(
                  'font-display text-lg leading-relaxed text-moon-100',
                  i === 0 ? 'text-moon-100' : 'text-white font-semibold'
                )}
                style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.8)' }}
              >
                {line}
              </motion.p>
            ))}
          </div>

          {/* Signature du narrateur de la partie — le fil conducteur du ton.
              À l'entrée en scène (nuit 1), elle prend toute sa place. */}
          {curtain.narrator && (
            <motion.div
              initial={{ opacity: 0, scale: curtain.isIntro ? 0.8 : 1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: curtain.isIntro ? 1.2 : 1.6, duration: 0.8, type: 'spring', damping: 18 }}
              className={cn(
                'mt-8 flex items-center gap-2 justify-center',
                curtain.isIntro && 'px-4 py-2 rounded-full border border-moon-500/30 bg-night-900/60'
              )}
            >
              <span className={curtain.isIntro ? 'text-2xl' : 'text-base'}>
                {curtain.narrator.emoji}
              </span>
              <span
                className={cn(
                  'font-display italic',
                  curtain.isIntro ? 'text-base text-moon-100/90' : 'text-sm text-moon-100/60'
                )}
              >
                — {curtain.narrator.name}, {curtain.narrator.tagline}
              </span>
            </motion.div>
          )}

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 2 }}
            className="absolute bottom-10 text-xs text-moon-100/50"
          >
            Touche l&apos;écran pour continuer
          </motion.p>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
