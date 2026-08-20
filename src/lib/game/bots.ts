/**
 * Votes automatiques des bots (pseudos 🤖), partagés par toutes les routes.
 *
 * Les bots votent DÈS L'ENTRÉE de phase (start, changement de phase, fin de
 * conseil) : le compteur de votes reflète la réalité et la résolution n'est
 * jamais bloquée par un bot — y compris en mode MJ arbitre, où rien ne
 * s'auto-résout au timer. Les résolutions gardent le même appel en filet de
 * sécurité (idempotent : un bot qui a déjà voté ne revote pas).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type Client = SupabaseClient<Database>;

const isBot = (pseudo: string) => pseudo.startsWith('🤖');

/**
 * Fait voter les loups bots qui n'ont pas encore voté cette nuit.
 * La meute bot vote une cible commune (un vote éclaté ne dévorerait personne
 * de façon fiable), tirée parmi les vivants non-loups — le MJ arbitre n'est
 * ciblable qu'en Auto-Garou, où il joue.
 */
export async function castBotWolfVotes(
  supabase: Client,
  gameId: string,
  phase: number,
  autoMode: boolean
): Promise<void> {
  const { data: alivePlayers } = await supabase
    .from('players')
    .select('id, pseudo, is_mj, role:roles(team)')
    .eq('game_id', gameId)
    .eq('is_alive', true);

  if (!alivePlayers || alivePlayers.length === 0) return;

  const wolves = alivePlayers.filter(
    (p) => (p.role as { team: string } | null)?.team === 'loups'
  );

  const { data: existingVotes } = await supabase
    .from('votes')
    .select('voter_id, target_id')
    .eq('game_id', gameId)
    .eq('phase', phase)
    .eq('vote_type', 'nuit_loup');

  const votedIds = new Set(existingVotes?.map((v) => v.voter_id) ?? []);
  const botWolves = wolves.filter((p) => isBot(p.pseudo) && !votedIds.has(p.id));
  if (botWolves.length === 0) return;

  const targets = alivePlayers.filter(
    (p) =>
      (p.role as { team: string } | null)?.team !== 'loups' && (autoMode || !p.is_mj)
  );
  if (targets.length === 0) return;

  // Si un loup (humain ou bot) a déjà voté, la meute bot suit la cible la
  // plus votée ; sinon elle en tire une au hasard.
  const wolfVoteCounts = new Map<string, number>();
  for (const vote of existingVotes ?? []) {
    if (vote.target_id && wolves.some((w) => w.id === vote.voter_id)) {
      wolfVoteCounts.set(vote.target_id, (wolfVoteCounts.get(vote.target_id) ?? 0) + 1);
    }
  }
  let targetId: string | null = null;
  let best = 0;
  for (const [id, count] of wolfVoteCounts) {
    if (count > best && targets.some((t) => t.id === id)) {
      best = count;
      targetId = id;
    }
  }
  if (!targetId) {
    targetId = targets[Math.floor(Math.random() * targets.length)].id;
  }

  await supabase.from('votes').insert(
    botWolves.map((bot) => ({
      game_id: gameId,
      voter_id: bot.id,
      target_id: targetId,
      vote_type: 'nuit_loup' as const,
      phase,
    }))
  );
}

/**
 * Fait voter au conseil les bots vivants qui n'ont pas encore voté.
 * Chaque bot vote un vivant au hasard (jamais lui-même ; le MJ arbitre n'est
 * ciblable qu'en Auto-Garou).
 */
export async function castBotCouncilVotes(
  supabase: Client,
  gameId: string,
  phase: number,
  autoMode: boolean
): Promise<void> {
  const { data: alivePlayers } = await supabase
    .from('players')
    .select('id, pseudo, is_mj')
    .eq('game_id', gameId)
    .eq('is_alive', true);

  if (!alivePlayers || alivePlayers.length === 0) return;

  const { data: existingVotes } = await supabase
    .from('votes')
    .select('voter_id')
    .eq('game_id', gameId)
    .eq('phase', phase)
    .eq('vote_type', 'jour');

  const votedIds = new Set(existingVotes?.map((v) => v.voter_id) ?? []);
  const botsToVote = alivePlayers.filter(
    (p) => isBot(p.pseudo) && !votedIds.has(p.id)
  );
  if (botsToVote.length === 0) return;

  const targets = alivePlayers.filter((p) => autoMode || !p.is_mj);

  const botVotes = botsToVote.flatMap((bot) => {
    const validTargets = targets.filter((t) => t.id !== bot.id);
    if (validTargets.length === 0) return [];
    const target = validTargets[Math.floor(Math.random() * validTargets.length)];
    return [
      {
        game_id: gameId,
        voter_id: bot.id,
        target_id: target.id,
        vote_type: 'jour' as const,
        phase,
      },
    ];
  });

  if (botVotes.length > 0) {
    await supabase.from('votes').insert(botVotes);
  }
}
