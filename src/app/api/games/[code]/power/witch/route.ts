import { createClient } from "@/lib/supabase/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET - Get witch status (wolf target, potions available)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');

  if (!playerId) {
    return NextResponse.json({ error: 'playerId requis' }, { status: 400 });
  }

  const supabase = createClient();

  // Get game
  const { data: game } = await supabase
    .from("games")
    .select("id, status, current_phase")
    .eq("code", code)
    .single();

  if (!game) {
    return NextResponse.json({ error: "Partie non trouvée" }, { status: 404 });
  }

  // Verify player is witch
  const { data: player } = await supabase
    .from("players")
    .select("id, role:roles(id, name)")
    .eq("id", playerId)
    .eq("game_id", game.id)
    .single();

  if (!player) {
    return NextResponse.json({ error: "Joueur non trouvé" }, { status: 404 });
  }

  const playerRole = player.role as { id: string; name: string } | null;
  if (!playerRole || playerRole.name !== "sorciere") {
    return NextResponse.json({ error: "Pas une sorcière" }, { status: 403 });
  }

  // Force bot wolves to vote before witch checks (so witch can see the target)
  const { data: aliveWolves } = await supabase
    .from("players")
    .select("id, pseudo, role:roles(team)")
    .eq("game_id", game.id)
    .eq("is_alive", true);

  const wolves = aliveWolves?.filter(
    (p) => (p.role as { team: string } | null)?.team === "loups"
  ) || [];

  if (wolves.length > 0) {
    // Get existing votes
    const { data: existingVotes } = await supabase
      .from('votes')
      .select('voter_id')
      .eq('game_id', game.id)
      .eq('phase', game.current_phase ?? 1)
      .eq('vote_type', 'nuit_loup');

    const votedIds = new Set(existingVotes?.map(v => v.voter_id) ?? []);

    // Find bot wolves who haven't voted
    const botWolves = wolves.filter(
      w => w.pseudo.startsWith('🤖') && !votedIds.has(w.id)
    );

    if (botWolves.length > 0) {
      // Get all alive non-wolf players as potential targets
      const nonWolfTargets = aliveWolves?.filter(
        p => (p.role as { team: string } | null)?.team !== 'loups'
      ) ?? [];

      if (nonWolfTargets.length > 0) {
        // Pick one random target for ALL bot wolves
        const randomTarget = nonWolfTargets[Math.floor(Math.random() * nonWolfTargets.length)];

        const botVotes = botWolves.map(bot => ({
          game_id: game.id,
          voter_id: bot.id,
          target_id: randomTarget.id,
          vote_type: 'nuit_loup' as const,
          phase: game.current_phase ?? 1,
        }));

        await supabase.from('votes').insert(botVotes);
      }
    }
  }

  // Get wolf votes for this phase (to know the target)
  const { data: wolfVotes } = await supabase
    .from("votes")
    .select("target_id")
    .eq("game_id", game.id)
    .eq("vote_type", "nuit_loup")
    .eq("phase", game.current_phase ?? 1);

  // Count votes to find the main target
  let wolfTarget: { id: string; pseudo: string } | null = null;
  if (wolfVotes && wolfVotes.length > 0) {
    const voteCounts: Record<string, number> = {};
    for (const vote of wolfVotes) {
      if (vote.target_id) {
        voteCounts[vote.target_id] = (voteCounts[vote.target_id] || 0) + 1;
      }
    }

    // Find max voted target
    let maxVotes = 0;
    let targetId: string | null = null;
    for (const [id, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        targetId = id;
      }
    }

    if (targetId) {
      const { data: targetPlayer } = await supabase
        .from("players")
        .select("id, pseudo")
        .eq("id", targetId)
        .single();

      if (targetPlayer) {
        wolfTarget = { id: targetPlayer.id, pseudo: targetPlayer.pseudo };
      }
    }
  }

  // Get witch's potions (check power_uses)
  const { data: lifePower } = await supabase
    .from("powers")
    .select("id")
    .eq("role_id", playerRole.id)
    .eq("name", "potion_vie")
    .single();

  const { data: deathPower } = await supabase
    .from("powers")
    .select("id")
    .eq("role_id", playerRole.id)
    .eq("name", "potion_mort")
    .single();

  // Check if potions were used this game
  const { data: lifePotionUse } = await supabase
    .from("power_uses")
    .select("id, phase")
    .eq("game_id", game.id)
    .eq("player_id", playerId)
    .eq("power_id", lifePower?.id || '')
    .maybeSingle();

  const { data: deathPotionUse } = await supabase
    .from("power_uses")
    .select("id, phase, target_id")
    .eq("game_id", game.id)
    .eq("player_id", playerId)
    .eq("power_id", deathPower?.id || '')
    .maybeSingle();

  // Check if used THIS phase specifically
  const usedLifePotionThisPhase = lifePotionUse?.phase === (game.current_phase ?? 1);
  const usedDeathPotionThisPhase = deathPotionUse?.phase === (game.current_phase ?? 1);

  return NextResponse.json({
    wolfTarget,
    hasLifePotion: !lifePotionUse,
    hasDeathPotion: !deathPotionUse,
    usedLifePotion: usedLifePotionThisPhase,
    usedDeathPotion: usedDeathPotionThisPhase,
    deathPotionTarget: deathPotionUse?.target_id || null,
  });
}

/**
 * POST - Use witch potion
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { playerId, action, targetId } = body;

  if (!playerId || !action) {
    return NextResponse.json(
      { error: "playerId et action requis" },
      { status: 400 }
    );
  }

  if (action !== 'life_potion' && action !== 'death_potion') {
    return NextResponse.json(
      { error: "Action invalide" },
      { status: 400 }
    );
  }

  if (action === 'death_potion' && !targetId) {
    return NextResponse.json(
      { error: "targetId requis pour potion de mort" },
      { status: 400 }
    );
  }

  const supabase = createClient();

  // Get game
  const { data: game } = await supabase
    .from("games")
    .select("id, status, current_phase")
    .eq("code", code)
    .single();

  if (!game) {
    return NextResponse.json({ error: "Partie non trouvée" }, { status: 404 });
  }

  if (game.status !== "nuit") {
    return NextResponse.json(
      { error: "Les potions ne peuvent être utilisées que la nuit" },
      { status: 400 }
    );
  }

  // Verify player is witch and alive
  const { data: player } = await supabase
    .from("players")
    .select("id, is_alive, pseudo, role:roles(id, name)")
    .eq("id", playerId)
    .eq("game_id", game.id)
    .single();

  if (!player) {
    return NextResponse.json({ error: "Joueur non trouvé" }, { status: 404 });
  }

  if (!player.is_alive) {
    return NextResponse.json(
      { error: "Les morts ne peuvent pas utiliser de potions" },
      { status: 400 }
    );
  }

  const playerRole = player.role as { id: string; name: string } | null;
  if (!playerRole || playerRole.name !== "sorciere") {
    return NextResponse.json(
      { error: "Seule la sorcière peut utiliser ce pouvoir" },
      { status: 403 }
    );
  }

  // Get the appropriate power
  const powerName = action === 'life_potion' ? 'potion_vie' : 'potion_mort';
  const { data: power } = await supabase
    .from("powers")
    .select("id")
    .eq("role_id", playerRole.id)
    .eq("name", powerName)
    .single();

  if (!power) {
    return NextResponse.json({ error: "Pouvoir non trouvé" }, { status: 404 });
  }

  // Check if already used this game
  const { data: existingUse } = await supabase
    .from("power_uses")
    .select("id")
    .eq("game_id", game.id)
    .eq("player_id", playerId)
    .eq("power_id", power.id);

  if (existingUse && existingUse.length > 0) {
    return NextResponse.json(
      { error: `Vous avez déjà utilisé cette potion` },
      { status: 400 }
    );
  }

  // Handle life potion
  if (action === 'life_potion') {
    // Get wolf target
    const { data: wolfVotes } = await supabase
      .from("votes")
      .select("target_id")
      .eq("game_id", game.id)
      .eq("vote_type", "nuit_loup")
      .eq("phase", game.current_phase ?? 1);

    if (!wolfVotes || wolfVotes.length === 0) {
      return NextResponse.json(
        { error: "Les loups n'ont pas encore voté" },
        { status: 400 }
      );
    }

    // Record power use (the night resolve will check this)
    await supabase.from("power_uses").insert({
      game_id: game.id,
      player_id: playerId,
      power_id: power.id,
      phase: game.current_phase ?? 1,
      result: { action: 'saved_wolf_target' },
    });

    // Log event
    await supabase.from("game_events").insert({
      game_id: game.id,
      event_type: "witch_life_potion",
      data: { witch_id: playerId },
    });

    return NextResponse.json({
      success: true,
      message: "Potion de vie utilisée",
    });
  }

  // Handle death potion
  if (action === 'death_potion') {
    // Verify target exists and is alive
    const { data: target } = await supabase
      .from("players")
      .select("id, pseudo, is_alive, is_mj")
      .eq("id", targetId)
      .eq("game_id", game.id)
      .single();

    if (!target) {
      return NextResponse.json({ error: "Cible non trouvée" }, { status: 404 });
    }

    if (!target.is_alive) {
      return NextResponse.json(
        { error: "La cible est déjà morte" },
        { status: 400 }
      );
    }

    if (target.is_mj) {
      return NextResponse.json(
        { error: "Impossible de cibler le MJ" },
        { status: 400 }
      );
    }

    if (targetId === playerId) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas vous cibler vous-même" },
        { status: 400 }
      );
    }

    // Record power use with target (the night resolve will process this)
    await supabase.from("power_uses").insert({
      game_id: game.id,
      player_id: playerId,
      power_id: power.id,
      target_id: targetId,
      phase: game.current_phase ?? 1,
      result: { action: 'poisoned', target_name: target.pseudo },
    });

    // Log event
    await supabase.from("game_events").insert({
      game_id: game.id,
      event_type: "witch_death_potion",
      data: { 
        witch_id: playerId,
        target_id: targetId,
        target_name: target.pseudo,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Potion de mort utilisée sur ${target.pseudo}`,
    });
  }

  return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
}
