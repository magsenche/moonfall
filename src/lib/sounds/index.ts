/**
 * Ambiance sonore de Moonfall — la voix du narrateur que l'app n'a pas.
 *
 * Tout est synthétisé via WebAudio (aucun asset, rien à télécharger, CSP
 * friendly). iOS exige un geste utilisateur pour débloquer l'audio :
 * appeler unlockAudio() sur le premier tap (fait par SoundEffects).
 * Le mute est persisté en localStorage.
 */

const MUTE_KEY = 'moonfall-muted';

let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  return audioContext;
}

/** À appeler sur un geste utilisateur (tap) pour débloquer l'audio iOS. */
export function unlockAudio(): void {
  const ctx = getContext();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume();
  }
}

const muteListeners = new Set<() => void>();

export function isMuted(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(MUTE_KEY) === '1';
}

export function setMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  for (const listener of muteListeners) listener();
}

/** Abonnement au mute pour useSyncExternalStore. */
export function subscribeMuted(listener: () => void): () => void {
  muteListeners.add(listener);
  return () => muteListeners.delete(listener);
}

/** Vibration (silencieuse si non supportée — iOS Safari notamment). */
export function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

interface Note {
  /** Fréquence en Hz */
  freq: number;
  /** Décalage de départ en secondes */
  at: number;
  /** Durée en secondes */
  duration: number;
  type?: OscillatorType;
  gain?: number;
}

function playNotes(notes: Note[]): void {
  if (isMuted()) return;
  const ctx = getContext();
  if (!ctx || ctx.state !== 'running') return;

  const now = ctx.currentTime;
  for (const note of notes) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = note.type ?? 'sine';
    osc.frequency.setValueAtTime(note.freq, now + note.at);

    const peak = note.gain ?? 0.12;
    gainNode.gain.setValueAtTime(0.0001, now + note.at);
    gainNode.gain.exponentialRampToValueAtTime(peak, now + note.at + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + note.at + note.duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now + note.at);
    osc.stop(now + note.at + note.duration + 0.05);
  }
}

/** 🌙 Le village s'endort : descente douce et grave. */
function nightCue(): void {
  playNotes([
    { freq: 440, at: 0, duration: 0.7 },
    { freq: 330, at: 0.45, duration: 0.7 },
    { freq: 220, at: 0.9, duration: 1.4, gain: 0.1 },
  ]);
}

/** ☀️ Le village se réveille : arpège clair et montant. */
function dayCue(): void {
  playNotes([
    { freq: 523, at: 0, duration: 0.25, type: 'triangle' },
    { freq: 659, at: 0.18, duration: 0.25, type: 'triangle' },
    { freq: 784, at: 0.36, duration: 0.5, type: 'triangle' },
  ]);
}

/** ⚖️ Le conseil s'ouvre : deux coups sourds de tambour. */
function councilCue(): void {
  playNotes([
    { freq: 110, at: 0, duration: 0.35, type: 'square', gain: 0.08 },
    { freq: 82, at: 0.4, duration: 0.6, type: 'square', gain: 0.1 },
  ]);
}

/** 🏁 Fin de partie : petite fanfare. */
function endCue(): void {
  playNotes([
    { freq: 392, at: 0, duration: 0.3, type: 'triangle' },
    { freq: 523, at: 0.22, duration: 0.3, type: 'triangle' },
    { freq: 659, at: 0.44, duration: 0.3, type: 'triangle' },
    { freq: 784, at: 0.66, duration: 0.9, type: 'triangle' },
  ]);
}

/** 💀 Tu es mort : glas grave. */
export function playDeathCue(): void {
  playNotes([
    { freq: 196, at: 0, duration: 1.0, gain: 0.14 },
    { freq: 131, at: 0.7, duration: 1.6, gain: 0.12 },
  ]);
  vibrate([300, 120, 300]);
}

/** Joue le jingle d'une transition de phase (+ vibration associée). */
export function playPhaseCue(phase: 'nuit' | 'jour' | 'conseil' | 'terminee'): void {
  switch (phase) {
    case 'nuit':
      nightCue();
      vibrate(150);
      break;
    case 'jour':
      dayCue();
      vibrate([120, 60, 120]);
      break;
    case 'conseil':
      councilCue();
      vibrate([100, 80, 100, 80, 200]);
      break;
    case 'terminee':
      endCue();
      vibrate([200, 100, 200, 100, 400]);
      break;
  }
}
