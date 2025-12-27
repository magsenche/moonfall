import { createClient } from "@/lib/supabase/client";
import { NextRequest, NextResponse } from "next/server";
import { PHASE_DURATIONS } from "@/types/game";
import type { GameSettings } from "@/types/game";

/**
 * Lazy Voting: Force bot wolves to vote randomly before resolution
 * Wolves should vote on the same target to be effective
 */
async function forceBotWolfVotes(gameId: string, phase: number, aliveWolves: { id: string; pseudo?: string }[]) {
  // Get existing votes
  const supabase = createClient();
  const { data: existingVotes } = await supabase
    .from('votes')
    .select('voter_id, target_id')
    .eq('game_id', gameId)
    .eq('phase', phase)
    .eq('vote_type', 'nuit_loup');

  const votedIds = new Set(existingVotes?.map(v => v.voter_id) ?? []);

  // Get all alive wolves with their pseudos
  const { data: wolfPlayers } = await supabase
    .from('players')
    .select('id, pseudo')
    .in('id', aliveWolves.map(w => w.id));

  if (!wolfPlayers) return;

  // Find bot wolves who haven't voted
  const botWolves = wolfPlayers.filter(
    p => p.pseudo.startsWith('🤖') && !votedIds.has(p.id)
  );

  if (botWolves.length === 0) return;

  // Get all alive non-wolf players as potential targets
  const { data: allPlayers } = await supabase
    .from('players')
    .select('id, role:roles(team)')
    .eq('game_id', gameId)
    .eq('is_alive', true);

  const nonWolfTargets = allPlayers?.filter(
    p => (p.role as { team: string } | null)?.team !== 'loups'
  ) ?? [];

  if (nonWolfTargets.length === 0) return;

  // Pick one random target for ALL bot wolves (they vote together)
  const randomTarget = nonWolfTargets[Math.floor(Math.random() * nonWolfTargets.length)];

  const botVotes = botWolves.map(bot => ({
    game_id: gameId,
    voter_id: bot.id,
    target_id: randomTarget.id,
    vote_type: 'nuit_loup' as const,
    phase,
  }));

  if (botVotes.length > 0) {
    await supabase.from('votes').insert(botVotes);
  }
}

/**
 * Auto-activate bot witch potions during night
 * Bot witches have a chance to save the wolf target and/or poison someone
 */
async function autoBotWitchPotions(supabase: Awaited<ReturnType<typeof createClient>>, gameId: string, phase: number) {
  // Find alive bot witches
  const { data: witches } = await supabase
    .from("players")
    .select("id, pseudo, role:roles(id, name)")
    .eq("game_id", gameId)
    .eq("is_alive", true);

  const botWitches = witches?.filter(
    w => w.pseudo.startsWith('🤖') && (w.role as { name: string } | null)?.name === 'sorciere'
  ) || [];

  if (botWitches.length === 0) return;

  // Get the sorciere role powers
  const { data: witchPowers } = await supabase
    .from("powers")
    .select("id, name")
    .eq("role_id", (botWitches[0].role as { id: string }).id);

  const lifePower = witchPowers?.find(p => p.name === 'potion_vie');
  const deathPower = witchPowers?.find(p => p.name === 'potion_mort');

  if (!lifePower || !deathPower) return;

  for (const witch of botWitches) {
    // Check if potions already used by this witch
    const { data: usedPowers } = await supabase
      .from("power_uses")
      .select("power_id")
      .eq("game_id", gameId)
      .eq("player_id", witch.id);

    const usedPowerIds = new Set(usedPowers?.map(p => p.power_id) ?? []);
    const hasLifePotion = !usedPowerIds.has(lifePower.id);
    const hasDeathPotion = !usedPowerIds.has(deathPower.id);

    if (!hasLifePotion && !hasDeathPotion) continue; // No potions left

    // Get wolf target from votes
    const { data: wolfVotes } = await supabase
      .from("votes")
      .select("target_id")
      .eq("game_id", gameId)
      .eq("vote_type", "nuit_loup")
      .eq("phase", phase);

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

    // Bot decision: 50% chance to save wolf target if they have life potion
    if (hasLifePotion && wolfTargetId && Math.random() < 0.5) {
      await supabase.from("power_uses").insert({
        game_id: gameId,
        player_id: witch.id,
        power_id: lifePower.id,
        phase,
        result: { action: 'saved_wolf_target', target_id: wolfTargetId },
      });
    }

    // Bot decision: 30% chance to poison a random player if they have death potion
    if (hasDeathPotion && Math.random() < 0.3) {
      // Get all alive players except the witch
      const { data: alivePlayers } = await supabase
        .from("players")
        .select("id")
        .eq("game_id", gameId)
        .eq("is_alive", true)
        .neq("id", witch.id);

      if (alivePlayers && alivePlayers.length > 0) {
        const randomTarget = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
        
        await supabase.from("power_uses").insert({
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

/**
 * Auto-activate bot hunter power when they die
 * Hunters shoot a random alive player when eliminated
 */
async function autoBotHunterShoot(supabase: Awaited<ReturnType<typeof createClient>>, gameId: string, deadPlayerId: string, phase: number) {
  // Check if dead player is a bot hunter
  const { data: deadPlayer } = await supabase
    .from("players")
    .select("id, pseudo, role:roles(id, name)")
    .eq("id", deadPlayerId)
    .single();

  if (!deadPlayer || !deadPlayer.pseudo.startsWith('🤖')) return null;
  
  const role = deadPlayer.role as { id: string; name: string } | null;
  if (!role || role.name !== 'chasseur') return null;

  // Get the tir_mortel power
  const { data: hunterPower } = await supabase
    .from("powers")
    .select("id")
    .eq("role_id", role.id)
    .eq("name", "tir_mortel")
    .single();

  if (!hunterPower) return null;

  // Check if already used
  const { data: powerUse } = await supabase
    .from("power_uses")
    .select("id")
    .eq("game_id", gameId)
    .eq("player_id", deadPlayerId)
    .eq("power_id", hunterPower.id)
    .maybeSingle();

  if (powerUse) return null; // Already used

  // Get all alive players (random target)
  const { data: alivePlayers } = await supabase
    .from("players")
    .select("id, pseudo")
    .eq("game_id", gameId)
    .eq("is_alive", true);

  if (!alivePlayers || alivePlayers.length === 0) return null;

  // Pick random target
  const randomTarget = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];

  // Kill the target
  const { data: shotVictim } = await supabase
    .from("players")
    .update({
      is_alive: false,
      death_reason: "tir_chasseur",
      death_at: new Date().toISOString(),
    })
    .eq("id", randomTarget.id)
    .select("pseudo, role:roles(name)")
    .single();

  if (!shotVictim) return null;

  // Record power use
  await supabase.from("power_uses").insert({
    game_id: gameId,
    player_id: deadPlayerId,
    power_id: hunterPower.id,
    target_id: randomTarget.id,
    phase,
    result: { auto_bot: true },
  });

  // Log event
  await supabase.from("game_events").insert({
    game_id: gameId,
    event_type: "hunter_shot",
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

// GET - Get wolf vote status (for MJ)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = createClient();

  const { data: game } = await supabase
    .from("games")
    .select("id, current_phase")
    .eq("code", code)
    .single();

  if (!game) {
    return NextResponse.json({ error: "Partie non trouvée" }, { status: 404 });
  }

  // Get all wolves alive
  const { data: wolves } = await supabase
    .from("players")
    .select("id, role:roles(team)")
    .eq("game_id", game.id)
    .eq("is_alive", true);

  const aliveWolves = wolves?.filter(
    (p) => (p.role as { team: string } | null)?.team === "loups"
  ) || [];

  // Get night votes
  const { data: votes } = await supabase
    .from("votes")
    .select("voter_id, target_id")
    .eq("game_id", game.id)
    .eq("vote_type", "nuit_loup")
    .eq("phase", game.current_phase ?? 1);

  const wolfVotes = votes?.filter((v) =>
    aliveWolves.some((w) => w.id === v.voter_id)
  ) || [];

  return NextResponse.json({
    voted: wolfVotes.length,
    total: aliveWolves.length,
  });
}

// POST - Resolve night vote (wolf attack)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = createClient();

  // Check if force parameter is passed
  let force = false;
  try {
    const body = await request.json();
    force = body.force === true;
  } catch {
    // No body or invalid JSON - that's fine, force defaults to false
  }

  // Get game with settings
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, status, current_phase, settings")
    .eq("code", code)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: "Partie non trouvée" }, { status: 404 });
  }

  if (game.status !== "nuit") {
    return NextResponse.json(
      { error: "Ce n'est pas la nuit" },
      { status: 400 }
    );
  }

  // Get custom duration from settings
  const settings = (game.settings || {}) as Partial<GameSettings>;
  const jourDurationSeconds = (settings.councilIntervalMinutes || 5) * 60;

  // Get all wolves alive
  const { data: wolves } = await supabase
    .from("players")
    .select("id, role:roles(team)")
    .eq("game_id", game.id)
    .eq("is_alive", true);

  const aliveWolves = wolves?.filter(
    (p) => (p.role as { team: string } | null)?.team === "loups"
  ) || [];

  // LAZY VOTING: Force bot wolves to vote before resolution
  await forceBotWolfVotes(game.id, game.current_phase ?? 1, aliveWolves);

  // BOT WITCH AUTO-ACTIVATION: Make bot witches use their potions randomly
  await autoBotWitchPotions(supabase, game.id, game.current_phase ?? 1);

  // Get night votes (refresh after lazy voting)
  const { data: votes } = await supabase
    .from("votes")
    .select("voter_id, target_id")
    .eq("game_id", game.id)
    .eq("vote_type", "nuit_loup")
    .eq("phase", game.current_phase ?? 1);

  // Check if all wolves have voted
  const wolfVotes = votes?.filter((v) =>
    aliveWolves.some((w) => w.id === v.voter_id)
  ) || [];

  // If not all wolves voted and not forcing, return error with count
  if (wolfVotes.length < aliveWolves.length && !force) {
    return NextResponse.json(
      { 
        error: "Tous les loups n'ont pas voté",
        voted: wolfVotes.length,
        total: aliveWolves.length,
        canForce: true
      },
      { status: 400 }
    );
  }

  // If no votes at all, just change phase without killing anyone
  if (wolfVotes.length === 0) {
    const phaseEndsAt = new Date(Date.now() + jourDurationSeconds * 1000).toISOString();
    await supabase
      .from("games")
      .update({ status: "jour", phase_ends_at: phaseEndsAt })
      .eq("id", game.id);

    await supabase.from("game_events").insert({
      game_id: game.id,
      event_type: "phase_change",
      data: { from: "nuit", to: "jour", noVictim: true },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Aucun vote - passage au jour sans victime" 
    });
  }

  // Count votes for each target
  const voteCounts: Record<string, number> = {};
  for (const vote of wolfVotes) {
    if (vote.target_id) {
      voteCounts[vote.target_id] = (voteCounts[vote.target_id] || 0) + 1;
    }
  }

  // Find the target with most votes
  let maxVotes = 0;
  let victims: string[] = [];

  for (const [targetId, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count;
      victims = [targetId];
    } else if (count === maxVotes) {
      victims.push(targetId);
    }
  }

  // In case of tie, pick randomly
  const victimId = victims[Math.floor(Math.random() * victims.length)];

  // Get victim info including role
  const { data: victimInfo } = await supabase
    .from("players")
    .select("id, pseudo, role:roles(id, name)")
    .eq("id", victimId)
    .single();

  if (!victimInfo) {
    return NextResponse.json(
      { error: "Victime non trouvée" },
      { status: 500 }
    );
  }

  const victimRole = victimInfo.role as { id: string; name: string } | null;
  
  // Check if victim is Ancien (Elder) and hasn't used their protection yet
  let elderSaved = false;
  if (victimRole?.name === 'ancien') {
    // Get the survie_ancienne power
    const { data: elderPower } = await supabase
      .from("powers")
      .select("id")
      .eq("role_id", victimRole.id)
      .eq("name", "survie_ancienne")
      .single();

    if (elderPower) {
      // Check if already used
      const { data: powerUse } = await supabase
        .from("power_uses")
        .select("id")
        .eq("game_id", game.id)
        .eq("player_id", victimId)
        .eq("power_id", elderPower.id)
        .maybeSingle();

      if (!powerUse) {
        // Ancien survives! Mark power as used
        elderSaved = true;
        await supabase.from("power_uses").insert({
          game_id: game.id,
          player_id: victimId,
          power_id: elderPower.id,
          phase: game.current_phase ?? 1,
          result: { saved: true },
        });

        // Log the event
        await supabase.from("game_events").insert({
          game_id: game.id,
          event_type: "elder_saved",
          data: {
            player_id: victimId,
            player_name: victimInfo.pseudo,
          },
        });
      }
    }
  }

  // If Ancien was saved, transition to day without killing
  if (elderSaved) {
    const phaseEndsAt = new Date(Date.now() + jourDurationSeconds * 1000).toISOString();
    await supabase
      .from("games")
      .update({ status: "jour", phase_ends_at: phaseEndsAt })
      .eq("id", game.id);

    await supabase.from("game_events").insert({
      game_id: game.id,
      event_type: "phase_change",
      data: { from: "nuit", to: "jour", elderSaved: true },
    });

    return NextResponse.json({
      success: true,
      elderSaved: true,
      message: `${victimInfo.pseudo} (l'Ancien) a survécu à l'attaque des loups !`,
    });
  }

  // Check if Witch used life potion this phase
  const { data: witchLifePotion } = await supabase
    .from("power_uses")
    .select("id")
    .eq("game_id", game.id)
    .eq("phase", game.current_phase ?? 1)
    .filter("result->>action", "eq", "saved_wolf_target")
    .maybeSingle();

  let witchSaved = false;
  if (witchLifePotion) {
    witchSaved = true;
    
    // Log the event
    await supabase.from("game_events").insert({
      game_id: game.id,
      event_type: "witch_saved_victim",
      data: {
        saved_id: victimId,
        saved_name: victimInfo.pseudo,
      },
    });
  }

  // Check if Witch used death potion this phase
  const { data: witchDeathPotion } = await supabase
    .from("power_uses")
    .select("target_id, result")
    .eq("game_id", game.id)
    .eq("phase", game.current_phase ?? 1)
    .filter("result->>action", "eq", "poisoned")
    .maybeSingle();

  // If witch saved the wolf target, skip killing them
  if (witchSaved) {
    // But still process death potion if used
    if (witchDeathPotion?.target_id) {
      const { data: poisonVictim } = await supabase
        .from("players")
        .update({
          is_alive: false,
          death_reason: "empoisonne",
          death_at: new Date().toISOString(),
        })
        .eq("id", witchDeathPotion.target_id)
        .select("pseudo, role:roles(name)")
        .single();

      if (poisonVictim) {
        await supabase.from("game_events").insert({
          game_id: game.id,
          event_type: "witch_poison_kill",
          data: {
            victim_id: witchDeathPotion.target_id,
            victim_name: poisonVictim.pseudo,
            victim_role: (poisonVictim.role as { name: string } | null)?.name,
          },
        });
      }
    }

    // Transition to day
    const phaseEndsAt = new Date(Date.now() + jourDurationSeconds * 1000).toISOString();
    await supabase
      .from("games")
      .update({ status: "jour", phase_ends_at: phaseEndsAt })
      .eq("id", game.id);

    await supabase.from("game_events").insert({
      game_id: game.id,
      event_type: "phase_change",
      data: { 
        from: "nuit", 
        to: "jour", 
        witchSaved: true,
        poisonVictim: witchDeathPotion?.target_id ? true : false,
      },
    });

    return NextResponse.json({
      success: true,
      witchSaved: true,
      message: `La sorcière a sauvé ${victimInfo.pseudo} avec sa potion de vie !`,
      poisonVictim: witchDeathPotion?.target_id ? true : false,
    });
  }

  // Kill the wolf victim
  const { data: victim, error: killError } = await supabase
    .from("players")
    .update({
      is_alive: false,
      death_reason: "devore",
      death_at: new Date().toISOString(),
    })
    .eq("id", victimId)
    .select("pseudo, role:roles(name)")
    .single();

  if (killError) {
    return NextResponse.json(
      { error: "Erreur lors de l'élimination" },
      { status: 500 }
    );
  }

  // Log the event
  await supabase.from("game_events").insert({
    game_id: game.id,
    event_type: "wolf_kill",
    data: {
      victim_id: victimId,
      victim_name: victim.pseudo,
      victim_role: (victim.role as { name: string } | null)?.name,
    },
  });

  // Check if victim was a bot hunter and auto-shoot
  const hunterShot = await autoBotHunterShoot(supabase, game.id, victimId, game.current_phase ?? 1);

  // Also process witch death potion if used (and not the same target as wolves)
  let poisonVictimName: string | null = null;
  if (witchDeathPotion?.target_id && witchDeathPotion.target_id !== victimId) {
    const { data: poisonVictim } = await supabase
      .from("players")
      .update({
        is_alive: false,
        death_reason: "empoisonne",
        death_at: new Date().toISOString(),
      })
      .eq("id", witchDeathPotion.target_id)
      .select("pseudo, role:roles(name)")
      .single();

    if (poisonVictim) {
      poisonVictimName = poisonVictim.pseudo;
      await supabase.from("game_events").insert({
        game_id: game.id,
        event_type: "witch_poison_kill",
        data: {
          victim_id: witchDeathPotion.target_id,
          victim_name: poisonVictim.pseudo,
          victim_role: (poisonVictim.role as { name: string } | null)?.name,
        },
      });
    }
  }

  // Check victory conditions
  const { data: alivePlayers } = await supabase
    .from("players")
    .select("id, is_mj, role:roles(team)")
    .eq("game_id", game.id)
    .eq("is_alive", true);

  const aliveNonMJ = alivePlayers?.filter((p) => !p.is_mj) || [];
  const remainingWolves = aliveNonMJ.filter(
    (p) => (p.role as { team: string } | null)?.team === "loups"
  );
  const remainingVillagers = aliveNonMJ.filter(
    (p) => (p.role as { team: string } | null)?.team !== "loups"
  );

  let winner: string | null = null;

  if (remainingWolves.length === 0) {
    winner = "village";
  } else if (remainingWolves.length >= remainingVillagers.length) {
    winner = "loups";
  }

  if (winner) {
    // Game over
    await supabase
      .from("games")
      .update({ status: "terminee" })
      .eq("id", game.id);

    await supabase.from("game_events").insert({
      game_id: game.id,
      event_type: "game_ended",
      data: { winner },
    });

    return NextResponse.json({
      success: true,
      victim: victim.pseudo,
      victimRole: (victim.role as { name: string } | null)?.name,
      hunterShot,
      gameOver: true,
      winner,
    });
  }

  // Transition to day with timer (using custom settings)
  const phaseEndsAt = new Date(Date.now() + jourDurationSeconds * 1000).toISOString();
  await supabase
    .from("games")
    .update({ 
      status: "jour",
      phase_ends_at: phaseEndsAt,
    })
    .eq("id", game.id);

  return NextResponse.json({
    success: true,
    victim: victim.pseudo,
    victimRole: (victim.role as { name: string } | null)?.name,
    hunterShot,
    gameOver: false,
  });
}
