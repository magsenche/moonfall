/**
 * Fonctions pures de résolution du jeu, partagées par les routes API.
 *
 * Ce fichier reste sans dépendance (aucun import) pour être exécutable
 * directement par `node --test` (npm run test:unit) sans bundler.
 */

export type Team = 'village' | 'loups' | 'solo';
export type Winner = 'village' | 'loups';

export interface VictoryPlayer {
  isAlive: boolean;
  isMj: boolean;
  team: Team | null;
}

/**
 * Conditions de victoire : village si plus aucun loup vivant, loups si
 * parité ou majorité loups/non-loups. En mode Auto-Garou le MJ joue et
 * compte dans les effectifs (countMj = true) ; en mode normal il est
 * arbitre et reste hors décompte.
 */
export function computeWinner(players: VictoryPlayer[], countMj: boolean): Winner | null {
  const counted = players.filter((p) => p.isAlive && (countMj || !p.isMj));
  const wolves = counted.filter((p) => p.team === 'loups').length;
  const others = counted.length - wolves;
  if (wolves === 0) return 'village';
  if (wolves >= others) return 'loups';
  return null;
}

export interface TallyResult {
  counts: Record<string, number>;
  max: number;
  /** Cibles à égalité en tête (vide si aucun vote exprimé). */
  leaders: string[];
}

/**
 * Décompte des votes avec poids optionnel par votant (double vote de la
 * boutique). Les votes blancs (target_id null) sont ignorés.
 */
export function tallyVotes(
  votes: { voter_id: string; target_id: string | null }[],
  weightForVoter?: (voterId: string) => number
): TallyResult {
  const counts: Record<string, number> = {};
  for (const vote of votes) {
    if (!vote.target_id) continue;
    const weight = weightForVoter ? weightForVoter(vote.voter_id) : 1;
    counts[vote.target_id] = (counts[vote.target_id] || 0) + weight;
  }

  let max = 0;
  let leaders: string[] = [];
  for (const [targetId, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      leaders = [targetId];
    } else if (count === max) {
      leaders.push(targetId);
    }
  }
  return { counts, max, leaders };
}

/** Lit le drapeau Auto-Garou depuis le JSON settings d'une partie. */
export function isAutoMode(settings: unknown): boolean {
  return (
    typeof settings === 'object' &&
    settings !== null &&
    (settings as { autoMode?: boolean }).autoMode === true
  );
}
