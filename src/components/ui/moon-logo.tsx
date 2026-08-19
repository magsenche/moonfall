import { cn } from '@/lib/utils';

interface MoonLogoProps {
  className?: string;
  size?: number;
}

/**
 * Lune croissante custom — remplace l'emoji 🌙.
 * Halo doux + cratères discrets, teintes lune (crème/ambre).
 */
export function MoonLogo({ className, size = 72 }: MoonLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      role="img"
      aria-label="Moonfall"
      className={cn('drop-shadow-[0_0_24px_rgba(229,189,114,0.35)]', className)}
    >
      <defs>
        <radialGradient id="moon-halo" cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="var(--moon-500)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--moon-500)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="moon-face" x1="20%" y1="10%" x2="80%" y2="95%">
          <stop offset="0%" stopColor="var(--moon-100)" />
          <stop offset="100%" stopColor="var(--moon-500)" />
        </linearGradient>
      </defs>

      {/* Halo */}
      <circle cx="50" cy="50" r="50" fill="url(#moon-halo)" />

      {/* Croissant : disque plein moins un disque décalé */}
      <mask id="moon-crescent">
        <circle cx="50" cy="50" r="34" fill="white" />
        <circle cx="64" cy="38" r="30" fill="black" />
      </mask>
      <circle cx="50" cy="50" r="34" fill="url(#moon-face)" mask="url(#moon-crescent)" />

      {/* Cratères */}
      <g mask="url(#moon-crescent)" fill="var(--moon-600)" opacity="0.45">
        <circle cx="36" cy="44" r="4" />
        <circle cx="30" cy="60" r="2.5" />
        <circle cx="42" cy="72" r="3.2" />
      </g>
    </svg>
  );
}
