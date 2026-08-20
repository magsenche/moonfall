/**
 * CouncilRecapCard - Le dernier conseil en bref : qui a voté contre qui.
 *
 * Repliée par défaut (une ligne de verdict), dépliée = détail des votes par
 * cible. Alimentée par GET /council-recap (événement `council_results`
 * persisté à la résolution — les votes anonymes arrivent déjà masqués).
 * Affichée la nuit et le jour, une fois qu'au moins un conseil a eu lieu.
 */

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MotionCard, CardContent } from '@/components/ui';
import { roleLabel } from '@/lib/game/narration';
import { cn } from '@/lib/utils';

interface CouncilVoteDetail {
  voter_pseudo: string | null;
  target_pseudo: string;
  is_anonymous: boolean;
  is_double: boolean;
}

interface CouncilResults {
  phase: number;
  eliminated: { pseudo: string; role: string; team: string } | null;
  tie: boolean;
  immunity_used: boolean;
  vote_details: CouncilVoteDetail[];
}

interface CouncilRecapCardProps {
  gameCode: string;
  gameStatus: string;
}

export function CouncilRecapCard({ gameCode, gameStatus }: CouncilRecapCardProps) {
  const [open, setOpen] = useState(false);
  const [council, setCouncil] = useState<CouncilResults | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/games/${gameCode}/council-recap`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setCouncil(data.council ?? null);
      })
      .catch(() => {
        // Carte purement informative : un échec de lecture ne montre rien
      });
    return () => {
      cancelled = true;
    };
  }, [gameCode, gameStatus]);

  // Pendant le conseil, le panneau de vote vit sa vie ; le récap concerne
  // les phases suivantes
  if (!council || gameStatus === 'conseil') return null;

  const verdict = council.eliminated
    ? `☠️ ${council.eliminated.pseudo} éliminé·e — ${roleLabel(council.eliminated.role) ?? council.eliminated.role}`
    : council.immunity_used
      ? '🛡️ Immunité ! Personne d\'éliminé'
      : council.tie
        ? '⚖️ Égalité — personne d\'éliminé'
        : '🕊️ Personne d\'éliminé';

  // Votes groupés par cible, cibles triées par nombre de voix
  const byTarget = new Map<string, CouncilVoteDetail[]>();
  for (const vote of council.vote_details) {
    const list = byTarget.get(vote.target_pseudo) ?? [];
    list.push(vote);
    byTarget.set(vote.target_pseudo, list);
  }
  const weight = (votes: CouncilVoteDetail[]) =>
    votes.reduce((sum, v) => sum + (v.is_double ? 2 : 1), 0);
  const sortedTargets = [...byTarget.entries()].sort(
    ([, a], [, b]) => weight(b) - weight(a)
  );

  return (
    <MotionCard variant="sticker" rotation={0.4}>
      <CardContent className="pt-4 pb-4">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center justify-between w-full gap-2"
        >
          <span className="text-left">
            <span className="block text-[11px] font-bold text-moon-100/50 uppercase tracking-wider">
              ⚖️ Conseil {council.phase}
            </span>
            <span className="block text-sm font-bold text-white mt-0.5">{verdict}</span>
          </span>
          <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-moon-100/60 shrink-0">
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
              <div className="space-y-2 pt-3">
                {sortedTargets.map(([targetPseudo, votes]) => {
                  const isEliminated = council.eliminated?.pseudo === targetPseudo;
                  const count = weight(votes);
                  return (
                    <div
                      key={targetPseudo}
                      className={cn(
                        'p-2.5 rounded-xl border',
                        isEliminated
                          ? 'bg-blood-700/30 border-blood-500/50'
                          : 'bg-night-800/50 border-night-600/50'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={cn('text-sm font-bold', isEliminated ? 'text-blood-400' : 'text-white')}>
                          {isEliminated && '☠️ '}
                          {targetPseudo}
                        </span>
                        <span className="text-xs font-bold text-moon-100/60">
                          {count} voix
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {votes.map((vote, i) => (
                          <span
                            key={i}
                            className={cn(
                              'text-[11px] px-2 py-0.5 rounded-lg border',
                              vote.is_anonymous
                                ? 'bg-night-700/50 border-village-400/50 text-village-300 italic'
                                : 'bg-night-700/50 border-night-600/50 text-moon-100/70'
                            )}
                          >
                            {vote.voter_pseudo ?? '???'}
                            {vote.is_double && ' ✌️'}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <p className="text-[10px] text-moon-100/40 pt-1">
                  ??? = vote anonyme · ✌️ = vote double
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </MotionCard>
  );
}
