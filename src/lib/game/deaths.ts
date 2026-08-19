/**
 * Cascade de morts partagée par toutes les routes qui tuent un joueur
 * (résolutions de nuit et de conseil, tir du chasseur, assassinat, poison).
 *
 * Règles couvertes :
 * - Enfant Sauvage : si le mort était son modèle, il devient loup-garou.
 * - Cupidon : si le mort était amoureux, son partenaire meurt de chagrin
 *   (et peut à son tour déclencher une transformation d'Enfant Sauvage).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { computeWinner, type VictoryPlayer, type Winner } from './resolution';

type Client = SupabaseClient<Database>;

export interface LoverDeath {
  loverId: string;
  loverPseudo: string;
  loverRole: string | null;
}

export interface WildChildTransformation {
  childId: string;
  childPseudo: string;
}

export interface DeathCascade {
  loverDeath: LoverDeath | null;
  wildChildTransformed: WildChildTransformation | null;
}

/** Si le mort était amoureux, tue son partenaire (chagrin) et logge l'événement. */
export async function checkLoverDeath(
  supabase: Client,
  gameId: string,
  deadPlayerId: string
): Promise<LoverDeath | null> {
  const { data: loversMatch } = await supabase
    .from('lovers')
    .select('id, player1_id, player2_id')
    .eq('game_id', gameId)
    .or(`player1_id.eq.${deadPlayerId},player2_id.eq.${deadPlayerId}`)
    .maybeSingle();

  if (!loversMatch) return null;

  const partnerId =
    loversMatch.player1_id === deadPlayerId ? loversMatch.player2_id : loversMatch.player1_id;

  const { data: partner } = await supabase
    .from('players')
    .select('id, pseudo, is_alive, role:roles(name)')
    .eq('id', partnerId)
    .single();

  if (!partner || !partner.is_alive) return null;

  await supabase
    .from('players')
    .update({
      is_alive: false,
      death_reason: 'chagrin',
      death_at: new Date().toISOString(),
    })
    .eq('id', partnerId);

  await supabase.from('game_events').insert({
    game_id: gameId,
    event_type: 'lover_heartbreak_death',
    data: {
      lover_id: partnerId,
      lover_name: partner.pseudo,
      lover_role: (partner.role as { name: string } | null)?.name,
      dead_partner_id: deadPlayerId,
    },
  });

  return {
    loverId: partnerId,
    loverPseudo: partner.pseudo,
    loverRole: (partner.role as { name: string } | null)?.name ?? null,
  };
}

/** Si le mort était le modèle d'un Enfant Sauvage vivant, le transforme en loup. */
export async function checkWildChildTransformation(
  supabase: Client,
  gameId: string,
  deadPlayerId: string
): Promise<WildChildTransformation | null> {
  const { data: wildChildModel } = await supabase
    .from('wild_child_models')
    .select('id, child_player_id, transformed')
    .eq('game_id', gameId)
    .eq('model_player_id', deadPlayerId)
    .eq('transformed', false)
    .maybeSingle();

  if (!wildChildModel) return null;

  const { data: wildChild } = await supabase
    .from('players')
    .select('id, pseudo, is_alive')
    .eq('id', wildChildModel.child_player_id)
    .single();

  if (!wildChild || !wildChild.is_alive) return null;

  const { data: wolfRole } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'loup_garou')
    .single();

  if (!wolfRole) return null;

  await supabase
    .from('players')
    .update({ role_id: wolfRole.id })
    .eq('id', wildChildModel.child_player_id);

  await supabase
    .from('wild_child_models')
    .update({ transformed: true })
    .eq('id', wildChildModel.id);

  await supabase.from('game_events').insert({
    game_id: gameId,
    event_type: 'wild_child_transformed',
    data: {
      child_id: wildChildModel.child_player_id,
      child_name: wildChild.pseudo,
      model_id: deadPlayerId,
      new_role: 'loup_garou',
    },
  });

  return {
    childId: wildChildModel.child_player_id,
    childPseudo: wildChild.pseudo,
  };
}

/**
 * Applique la cascade complète après une mort : transformation d'Enfant
 * Sauvage, mort de chagrin de l'amoureux, puis transformation éventuelle
 * déclenchée par la mort de l'amoureux. À appeler après CHAQUE mort,
 * quelle qu'en soit la cause.
 */
export async function applyDeathCascade(
  supabase: Client,
  gameId: string,
  deadPlayerId: string
): Promise<DeathCascade> {
  const wildChildTransformed = await checkWildChildTransformation(supabase, gameId, deadPlayerId);
  const loverDeath = await checkLoverDeath(supabase, gameId, deadPlayerId);
  if (loverDeath) {
    await checkWildChildTransformation(supabase, gameId, loverDeath.loverId);
  }
  return { wildChildTransformed, loverDeath };
}

/**
 * Vérifie les conditions de victoire en base et clôt la partie le cas
 * échéant (statut terminee + colonne winner + événement game_ended).
 * Retourne le vainqueur, ou null si la partie continue.
 */
export async function endGameIfVictory(
  supabase: Client,
  gameId: string,
  countMj: boolean,
  eventData?: Record<string, unknown>
): Promise<Winner | null> {
  const { data: players } = await supabase
    .from('players')
    .select('is_alive, is_mj, role:roles(team)')
    .eq('game_id', gameId);

  const winner = computeWinner(
    (players ?? []).map((p) => ({
      isAlive: p.is_alive ?? false,
      isMj: p.is_mj ?? false,
      team: ((p.role as { team: string } | null)?.team ?? null) as VictoryPlayer['team'],
    })),
    countMj
  );

  if (!winner) return null;

  await supabase.from('games').update({ status: 'terminee', winner }).eq('id', gameId);
  await supabase.from('game_events').insert({
    game_id: gameId,
    event_type: 'game_ended',
    data: { winner, ...(eventData ?? {}) },
  });

  return winner;
}
