/**
 * SoundEffects - La voix du narrateur : jingles et vibrations de phase.
 *
 * Composant invisible monté dans GameClient. Joue un jingle WebAudio à
 * chaque transition de phase (nuit/jour/conseil/fin) et un glas quand le
 * joueur meurt. Débloque l'audio iOS au premier tap, et expose un bouton
 * mute flottant (préférence persistée en localStorage).
 */

'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  isMuted,
  playDeathCue,
  playPhaseCue,
  setMuted,
  subscribeMuted,
  unlockAudio,
} from '@/lib/sounds';
import { useGame } from '../context';

export function SoundEffects() {
  const { gameStatus, isAlive, currentPlayerId } = useGame();
  const previousStatusRef = useRef<string | null>(null);
  const previousAliveRef = useRef<boolean>(true);
  // SSR-safe : muet côté serveur, préférence localStorage côté client
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => true);

  // Déblocage audio iOS au premier geste
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('touchstart', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  // Jingle à chaque transition de phase (pas au premier rendu : on arrive
  // peut-être en cours de partie après un refresh)
  useEffect(() => {
    const previous = previousStatusRef.current;
    previousStatusRef.current = gameStatus;
    if (previous === null || previous === gameStatus) return;
    if (gameStatus === 'nuit' || gameStatus === 'jour' || gameStatus === 'conseil' || gameStatus === 'terminee') {
      playPhaseCue(gameStatus);
    }
  }, [gameStatus]);

  // Glas quand le joueur meurt
  useEffect(() => {
    const wasAlive = previousAliveRef.current;
    previousAliveRef.current = isAlive;
    if (currentPlayerId && wasAlive && !isAlive) {
      playDeathCue();
    }
  }, [isAlive, currentPlayerId]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (!next) {
      unlockAudio();
      // Petit retour immédiat pour confirmer que le son marche
      playPhaseCue(gameStatus === 'nuit' ? 'nuit' : 'jour');
    }
  };

  return (
    <button
      type="button"
      onClick={toggleMute}
      aria-label={muted ? 'Activer le son' : 'Couper le son'}
      className={cn(
        'fixed bottom-4 left-4 z-40 w-11 h-11 rounded-full',
        'flex items-center justify-center',
        'border-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)]',
        'transition-colors safe-area-bottom',
        muted
          ? 'bg-night-800/90 border-night-600 text-moon-100/50'
          : 'bg-village-600/90 border-village-400 text-white'
      )}
    >
      {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
    </button>
  );
}
