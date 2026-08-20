/**
 * LE module du comportement des bots (pseudos 🤖) — toute action automatique
 * d'un bot vit ici, appelée par les routes aux bons moments.
 *
 * Principe : les bots garantissent que la partie AVANCE et que les mécaniques
 * fonctionnent, quel que soit le mode (Auto-Garou ou MJ arbitre, où rien ne
 * s'auto-résout au timer).
 *
 * Séquence (l'ordre compte) :
 * - ENTRÉE DE NUIT (`runBotNightEntryActions`) : Cupidon (nuit 1, les
 *   amoureux doivent exister avant la première mort) → Enfant Sauvage
 *   (choix du modèle avant qu'il puisse mourir) → Salvateur (protection posée
 *   avant la résolution, sans connaître la cible des loups) → vote de meute.
 * - RÉSOLUTION DE NUIT : filet de sécurité loups → Sorcière bot (elle doit
 *   voir la cible des loups, donc après leur vote) → tally → Chasseur bot si
 *   la victime en est un.
 * - ENTRÉE DE CONSEIL (`runBotCouncilEntryActions`) : vote de chaque bot.
 * - RÉSOLUTION DE CONSEIL : filet de sécurité → Chasseur bot si éliminé.
 *
 * Rôles bots volontairement passifs (choix assumé, pas un oubli) : Voyante
 * (action invisible, aucun effet de jeu), Petite Fille et Ancien (passifs),
 * Trublion et Assassin (un échange de rôles ou un kill silencieux décidé par
 * un bot dégraderait la partie des humains sans rien débloquer — leur
 * inaction ne bloque jamais une résolution).
 *
 * Toutes les fonctions sont idempotentes : un bot qui a déjà agi n'agit pas
 * deux fois, les routes peuvent donc rappeler ce module en filet de sécurité.
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

  const botWolves = wolves.filter((p) => isBot(p.pseudo));
  if (botWolves.length === 0) return;

  const targets = alivePlayers.filter(
    (p) =>
      (p.role as { team: string } | null)?.team !== 'loups' && (autoMode || !p.is_mj)
  );
  if (targets.length === 0) return;

  // LES LOUPS HUMAINS DÉCIDENT, la meute bot suit : cible = pluralité des
  // votes des loups humains (égalité → le vote humain le plus récent).
  // Sans vote humain : la cible bot déjà posée, sinon une au hasard.
  const wolfVotes = (existingVotes ?? []).filter(
    (v) => v.target_id && wolves.some((w) => w.id === v.voter_id)
  );
  const humanWolfIds = new Set(
    wolves.filter((w) => !isBot(w.pseudo)).map((w) => w.id)
  );
  const humanVotes = wolfVotes.filter((v) => humanWolfIds.has(v.voter_id));

  let targetId: string | null = null;
  const pickPlurality = (votes: typeof wolfVotes) => {
    const counts = new Map<string, number>();
    for (const vote of votes) {
      if (vote.target_id && targets.some((t) => t.id === vote.target_id)) {
        counts.set(vote.target_id, (counts.get(vote.target_id) ?? 0) + 1);
      }
    }
    // Égalité entre cibles : >= garde la dernière vue, donc le vote le plus
    // récent parmi les ex æquo l'emporte
    let best = 0;
    let picked: string | null = null;
    for (const [id, count] of counts) {
      if (count >= best) {
        best = count;
        picked = id;
      }
    }
    return picked;
  };
  targetId = pickPlurality(humanVotes) ?? pickPlurality(wolfVotes);
  if (!targetId) {
    targetId = targets[Math.floor(Math.random() * targets.length)].id;
  }

  // Upsert : les bots sans vote votent, ceux qui divergent se rallient
  const votedTarget = new Map(
    (existingVotes ?? []).map((v) => [v.voter_id, v.target_id])
  );
  for (const bot of botWolves) {
    const current = votedTarget.get(bot.id);
    if (current === targetId) continue;
    if (votedTarget.has(bot.id)) {
      await supabase
        .from('votes')
        .update({ target_id: targetId })
        .eq('game_id', gameId)
        .eq('voter_id', bot.id)
        .eq('vote_type', 'nuit_loup')
        .eq('phase', phase);
    } else {
      await supabase.from('votes').insert({
        game_id: gameId,
        voter_id: bot.id,
        target_id: targetId,
        vote_type: 'nuit_loup' as const,
        phase,
      });
    }
  }
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

/**
 * Cupidon bot : désigne deux amoureux au hasard, une seule fois par partie,
 * dès la nuit 1 — la mécanique du chagrin doit exister avant la première mort.
 */
export async function castBotCupidonLovers(
  supabase: Client,
  gameId: string,
  phase: number
): Promise<void> {
  if (phase !== 1) return;

  const { data: existingLovers } = await supabase
    .from('lovers')
    .select('id')
    .eq('game_id', gameId)
    .limit(1);
  if (existingLovers && existingLovers.length > 0) return;

  const { data: alivePlayers } = await supabase
    .from('players')
    .select('id, pseudo, is_mj, role:roles(id, name)')
    .eq('game_id', gameId)
    .eq('is_alive', true);
  if (!alivePlayers) return;

  const botCupidon = alivePlayers.find(
    (p) => isBot(p.pseudo) && (p.role as { name: string } | null)?.name === 'cupidon'
  );
  if (!botCupidon) return;

  // Le MJ arbitre n'est jamais amoureux (même règle que la route cupidon)
  const candidates = alivePlayers.filter((p) => !p.is_mj);
  if (candidates.length < 2) return;
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const [lover1, lover2] = shuffled;

  const { error: insertError } = await supabase.from('lovers').insert({
    game_id: gameId,
    player1_id: lover1.id,
    player2_id: lover2.id,
  });
  if (insertError) return;

  const cupidonRole = botCupidon.role as { id: string } | null;
  if (cupidonRole) {
    const { data: power } = await supabase
      .from('powers')
      .select('id')
      .eq('role_id', cupidonRole.id)
      .eq('name', 'lien_amoureux')
      .single();
    if (power) {
      await supabase.from('power_uses').insert({
        game_id: gameId,
        player_id: botCupidon.id,
        power_id: power.id,
        phase,
        result: { lover1_id: lover1.id, lover2_id: lover2.id, auto_bot: true },
      });
    }
  }

  await supabase.from('game_events').insert({
    game_id: gameId,
    event_type: 'cupidon_lovers_chosen',
    actor_id: botCupidon.id,
    data: {
      lover1_id: lover1.id,
      lover1_name: lover1.pseudo,
      lover2_id: lover2.id,
      lover2_name: lover2.pseudo,
      auto_bot: true,
    },
  });
}

/**
 * Enfant Sauvage bot : choisit son modèle au hasard s'il n'en a pas encore —
 * le modèle doit exister avant de pouvoir mourir (et le transformer).
 */
export async function castBotWildChildModels(
  supabase: Client,
  gameId: string,
  phase: number,
  autoMode: boolean
): Promise<void> {
  const { data: alivePlayers } = await supabase
    .from('players')
    .select('id, pseudo, is_mj, role:roles(name)')
    .eq('game_id', gameId)
    .eq('is_alive', true);
  if (!alivePlayers) return;

  const botChildren = alivePlayers.filter(
    (p) => isBot(p.pseudo) && (p.role as { name: string } | null)?.name === 'enfant_sauvage'
  );
  if (botChildren.length === 0) return;

  const { data: existingModels } = await supabase
    .from('wild_child_models')
    .select('child_player_id')
    .eq('game_id', gameId);
  const hasModel = new Set(existingModels?.map((m) => m.child_player_id) ?? []);

  for (const child of botChildren) {
    if (hasModel.has(child.id)) continue;
    const candidates = alivePlayers.filter(
      (p) => p.id !== child.id && (autoMode || !p.is_mj)
    );
    if (candidates.length === 0) continue;
    const model = candidates[Math.floor(Math.random() * candidates.length)];

    await supabase.from('wild_child_models').insert({
      game_id: gameId,
      child_player_id: child.id,
      model_player_id: model.id,
      transformed: false,
    });
    await supabase.from('game_events').insert({
      game_id: gameId,
      event_type: 'power_used',
      actor_id: child.id,
      target_id: model.id,
      data: { power: 'choose_model', secret: true, auto_bot: true },
    });
  }
}

/**
 * Salvateur bot : protège un vivant au hasard chaque nuit, jamais le même que
 * la nuit précédente (même règle que la route salvateur). Posé à l'entrée de
 * nuit, avant la résolution qui lira la protection.
 */
export async function castBotSalvateurProtections(
  supabase: Client,
  gameId: string,
  phase: number,
  autoMode: boolean
): Promise<void> {
  const { data: alivePlayers } = await supabase
    .from('players')
    .select('id, pseudo, is_mj, role:roles(name)')
    .eq('game_id', gameId)
    .eq('is_alive', true);
  if (!alivePlayers) return;

  const botSalvateurs = alivePlayers.filter(
    (p) => isBot(p.pseudo) && (p.role as { name: string } | null)?.name === 'salvateur'
  );
  if (botSalvateurs.length === 0) return;

  for (const salvateur of botSalvateurs) {
    const { data: existing } = await supabase
      .from('salvateur_protections')
      .select('id')
      .eq('game_id', gameId)
      .eq('salvateur_player_id', salvateur.id)
      .eq('phase', phase)
      .limit(1);
    if (existing && existing.length > 0) continue;

    const { data: lastProtection } = await supabase
      .from('salvateur_protections')
      .select('protected_player_id')
      .eq('game_id', gameId)
      .eq('salvateur_player_id', salvateur.id)
      .eq('phase', phase - 1)
      .maybeSingle();

    const candidates = alivePlayers.filter(
      (p) =>
        (autoMode || !p.is_mj) && p.id !== lastProtection?.protected_player_id
    );
    if (candidates.length === 0) continue;
    const target = candidates[Math.floor(Math.random() * candidates.length)];

    await supabase.from('salvateur_protections').insert({
      game_id: gameId,
      salvateur_player_id: salvateur.id,
      protected_player_id: target.id,
      phase,
    });
  }
}

/**
 * Sorcière bot : à la RÉSOLUTION de nuit (elle doit voir la cible des loups) —
 * 50 % de chances de sauver la victime avec sa potion de vie, 30 % d'empoisonner
 * un joueur au hasard. Chaque potion à usage unique.
 */
export async function autoBotWitchPotions(
  supabase: Client,
  gameId: string,
  phase: number,
  autoMode: boolean
): Promise<void> {
  const { data: players } = await supabase
    .from('players')
    .select('id, pseudo, role:roles(id, name)')
    .eq('game_id', gameId)
    .eq('is_alive', true);

  const botWitches =
    players?.filter(
      (w) => isBot(w.pseudo) && (w.role as { name: string } | null)?.name === 'sorciere'
    ) || [];
  if (botWitches.length === 0) return;

  const { data: witchPowers } = await supabase
    .from('powers')
    .select('id, name')
    .eq('role_id', (botWitches[0].role as { id: string }).id);
  const lifePower = witchPowers?.find((p) => p.name === 'potion_vie');
  const deathPower = witchPowers?.find((p) => p.name === 'potion_mort');
  if (!lifePower || !deathPower) return;

  for (const witch of botWitches) {
    const { data: usedPowers } = await supabase
      .from('power_uses')
      .select('power_id')
      .eq('game_id', gameId)
      .eq('player_id', witch.id);
    const usedPowerIds = new Set(usedPowers?.map((p) => p.power_id) ?? []);
    const hasLifePotion = !usedPowerIds.has(lifePower.id);
    const hasDeathPotion = !usedPowerIds.has(deathPower.id);
    if (!hasLifePotion && !hasDeathPotion) continue;

    const { data: wolfVotes } = await supabase
      .from('votes')
      .select('target_id')
      .eq('game_id', gameId)
      .eq('vote_type', 'nuit_loup')
      .eq('phase', phase);

    const voteCounts: Record<string, number> = {};
    for (const vote of wolfVotes || []) {
      if (vote.target_id) {
        voteCounts[vote.target_id] = (voteCounts[vote.target_id] || 0) + 1;
      }
    }
    let wolfTargetId: string | null = null;
    let maxVotes = 0;
    for (const [id, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        wolfTargetId = id;
      }
    }

    if (hasLifePotion && wolfTargetId && Math.random() < 0.5) {
      await supabase.from('power_uses').insert({
        game_id: gameId,
        player_id: witch.id,
        power_id: lifePower.id,
        phase,
        result: { action: 'saved_wolf_target', target_id: wolfTargetId },
      });
    }

    if (hasDeathPotion && Math.random() < 0.3) {
      const { data: alive } = await supabase
        .from('players')
        .select('id, is_mj')
        .eq('game_id', gameId)
        .eq('is_alive', true)
        .neq('id', witch.id);
      const targets = alive?.filter((p) => autoMode || !p.is_mj);
      if (targets && targets.length > 0) {
        const randomTarget = targets[Math.floor(Math.random() * targets.length)];
        await supabase.from('power_uses').insert({
          game_id: gameId,
          player_id: witch.id,
          power_id: deathPower.id,
          target_id: randomTarget.id,
          phase,
          result: { action: 'poisoned', target_id: randomTarget.id },
        });
      }
    }
  }
}

export interface BotHunterShot {
  victimId: string;
  victimPseudo: string;
  victimRole: string | null | undefined;
}

/**
 * Chasseur bot : quand il meurt (dévoré ou éliminé), tire sur un vivant au
 * hasard. Tir unique. Retourne la victime du tir, ou null.
 */
export async function autoBotHunterShoot(
  supabase: Client,
  gameId: string,
  deadPlayerId: string,
  phase: number
): Promise<BotHunterShot | null> {
  const { data: deadPlayer } = await supabase
    .from('players')
    .select('id, pseudo, role:roles(id, name)')
    .eq('id', deadPlayerId)
    .single();

  if (!deadPlayer || !isBot(deadPlayer.pseudo)) return null;
  const role = deadPlayer.role as { id: string; name: string } | null;
  if (!role || role.name !== 'chasseur') return null;

  const { data: hunterPower } = await supabase
    .from('powers')
    .select('id')
    .eq('role_id', role.id)
    .eq('name', 'tir_mortel')
    .single();
  if (!hunterPower) return null;

  const { data: powerUse } = await supabase
    .from('power_uses')
    .select('id')
    .eq('game_id', gameId)
    .eq('player_id', deadPlayerId)
    .eq('power_id', hunterPower.id)
    .maybeSingle();
  if (powerUse) return null;

  const { data: alivePlayers } = await supabase
    .from('players')
    .select('id, pseudo')
    .eq('game_id', gameId)
    .eq('is_alive', true);
  if (!alivePlayers || alivePlayers.length === 0) return null;

  const randomTarget = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];

  const { data: shotVictim } = await supabase
    .from('players')
    .update({
      is_alive: false,
      death_reason: 'tir_chasseur',
      death_at: new Date().toISOString(),
    })
    .eq('id', randomTarget.id)
    .select('pseudo, role:roles(name)')
    .single();
  if (!shotVictim) return null;

  await supabase.from('power_uses').insert({
    game_id: gameId,
    player_id: deadPlayerId,
    power_id: hunterPower.id,
    target_id: randomTarget.id,
    phase,
    result: { auto_bot: true },
  });

  await supabase.from('game_events').insert({
    game_id: gameId,
    event_type: 'hunter_shot',
    data: {
      hunter_id: deadPlayerId,
      hunter_name: deadPlayer.pseudo,
      victim_id: randomTarget.id,
      victim_name: shotVictim.pseudo,
      victim_role: (shotVictim.role as { name: string } | null)?.name,
      auto_bot: true,
    },
  });

  return {
    victimId: randomTarget.id,
    victimPseudo: shotVictim.pseudo,
    victimRole: (shotVictim.role as { name: string } | null)?.name,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrateurs : UN point d'entrée par moment de jeu
// ─────────────────────────────────────────────────────────────────────────────

/** Entrée de nuit (start, route phase, fin de conseil) — l'ordre compte. */
export async function runBotNightEntryActions(
  supabase: Client,
  gameId: string,
  phase: number,
  autoMode: boolean
): Promise<void> {
  await castBotCupidonLovers(supabase, gameId, phase);
  await castBotWildChildModels(supabase, gameId, phase, autoMode);
  await castBotSalvateurProtections(supabase, gameId, phase, autoMode);
  await castBotWolfVotes(supabase, gameId, phase, autoMode);
}

/** Entrée de conseil (route phase). */
export async function runBotCouncilEntryActions(
  supabase: Client,
  gameId: string,
  phase: number,
  autoMode: boolean
): Promise<void> {
  await castBotCouncilVotes(supabase, gameId, phase, autoMode);
}
