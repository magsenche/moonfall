/**
 * Verrou optimiste de résolution de phase.
 *
 * Plusieurs clients peuvent appeler les endpoints de résolution au même
 * moment (auto-résolution à l'expiration du timer sur chaque téléphone,
 * bouton MJ). Une double résolution ferait deux victimes au lieu d'une.
 *
 * Le verrou s'appuie sur un UPDATE conditionnel de games.phase_ends_at :
 * le premier appel qui « tamponne » la ligne gagne, les suivants ne matchent
 * plus la condition et sont rejetés. Si une résolution meurt en cours de
 * route, le tampon reste lisible et un nouvel appel reprend le verrou —
 * pas de blocage définitif.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type Client = SupabaseClient<Database>;
type GameStatus = Database['public']['Enums']['game_status'];

/** Tampon posé pendant une résolution (epoch : jamais une vraie échéance). */
export const RESOLUTION_LOCK_STAMP = new Date(0).toISOString();

/**
 * Tente de prendre le verrou de résolution pour une partie.
 * Retourne true si ce processus est le résolveur ; false si une autre
 * résolution vient de prendre le verrou (l'appelant doit répondre 409).
 */
export async function acquirePhaseLock(
  supabase: Client,
  game: { id: string; status: GameStatus; phase_ends_at: string | null }
): Promise<boolean> {
  let query = supabase
    .from('games')
    .update({ phase_ends_at: RESOLUTION_LOCK_STAMP })
    .eq('id', game.id)
    .eq('status', game.status);

  query =
    game.phase_ends_at === null
      ? query.is('phase_ends_at', null)
      : query.eq('phase_ends_at', game.phase_ends_at);

  const { data, error } = await query.select('id');
  if (error) {
    throw new Error(`Prise du verrou de résolution impossible : ${error.message}`);
  }
  return (data?.length ?? 0) > 0;
}
