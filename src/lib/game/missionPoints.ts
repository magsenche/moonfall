/**
 * Attribution des points de mission, partagée par les routes missions
 * (validation MJ, first_wins, best_score, self) et enchères (declare_winner).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type Client = SupabaseClient<Database>;

/**
 * Crédite des points de mission à un joueur via la fonction SQL
 * `award_mission_points` — qui applique le multiplicateur de rôle (ex.
 * villageois ×1.5) — et journalise un événement `points_earned`.
 * Retourne le nombre de points réellement crédités (multiplicateur inclus).
 */
export async function awardMissionPoints(
  supabase: Client,
  options: {
    gameId: string;
    playerId: string;
    basePoints: number;
    reason: string;
    eventData?: Record<string, unknown>;
  }
): Promise<number> {
  const { gameId, playerId, basePoints, reason, eventData } = options;

  const { data: before } = await supabase
    .from('players')
    .select('mission_points')
    .eq('id', playerId)
    .single();
  const pointsBefore = before?.mission_points ?? 0;

  const { data: newTotal, error } = await supabase.rpc('award_mission_points', {
    p_player_id: playerId,
    p_points: basePoints,
    p_reason: reason,
  });

  if (error) {
    throw new Error(`award_mission_points a échoué pour ${playerId} : ${error.message}`);
  }

  const awarded = (typeof newTotal === 'number' ? newTotal : pointsBefore) - pointsBefore;

  await supabase.from('game_events').insert({
    game_id: gameId,
    actor_id: playerId,
    event_type: 'points_earned',
    data: {
      reason,
      base_points: basePoints,
      points: awarded,
      ...(eventData ?? {}),
    },
  });

  return awarded;
}
