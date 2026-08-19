import { cn } from '@/lib/utils';

interface NightSkyProps {
  className?: string;
  /** Position verticale du halo de lune (ex: '-15%') */
  moonGlowTop?: string;
}

/* Étoiles en positions fixes (pas de random : rendu stable SSR/CSR) */
const STARS = [
  { left: '8%', top: '12%', size: 2, opacity: 0.7 },
  { left: '22%', top: '32%', size: 1, opacity: 0.4 },
  { left: '35%', top: '8%', size: 1.5, opacity: 0.6 },
  { left: '48%', top: '22%', size: 1, opacity: 0.35 },
  { left: '62%', top: '6%', size: 2, opacity: 0.65 },
  { left: '74%', top: '28%', size: 1, opacity: 0.4 },
  { left: '88%', top: '14%', size: 1.5, opacity: 0.55 },
  { left: '15%', top: '55%', size: 1, opacity: 0.3 },
  { left: '82%', top: '48%', size: 1, opacity: 0.35 },
  { left: '55%', top: '42%', size: 1.5, opacity: 0.3 },
  { left: '30%', top: '70%', size: 1, opacity: 0.25 },
  { left: '70%', top: '66%', size: 1, opacity: 0.25 },
];

/**
 * Fond "Nuit de village" : dégradé nocturne, étoiles fixes,
 * halo de lune discret. Zéro animation décorative.
 */
export function NightSky({ className, moonGlowTop = '-20%' }: NightSkyProps) {
  return (
    <div className={cn('fixed inset-0 -z-10 overflow-hidden', className)} aria-hidden>
      {/* Dégradé nocturne */}
      <div className="absolute inset-0 bg-gradient-to-b from-night-900 via-night-950 to-night-950" />

      {/* Halo lunaire en haut de page */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
        style={{
          top: moonGlowTop,
          background:
            'radial-gradient(circle, rgba(229,189,114,0.08) 0%, rgba(229,189,114,0.03) 45%, transparent 70%)',
        }}
      />

      {/* Étoiles */}
      {STARS.map((star, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-moon-100"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
          }}
        />
      ))}

      {/* Silhouette de colline en bas */}
      <svg
        className="absolute bottom-0 left-0 w-full text-night-900"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        fill="currentColor"
      >
        <path d="M0,120 L0,80 Q360,20 720,60 T1440,50 L1440,120 Z" opacity="0.8" />
      </svg>

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.35)_100%)]" />
    </div>
  );
}
