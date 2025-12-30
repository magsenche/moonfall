import { createClient } from "@/lib/supabase/client";
import { NextRequest, NextResponse } from "next/server";

// POST - Assassin uses his power to assassinate a player
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { playerId, targetId } = body;

  if (!playerId || !targetId) {
    return NextResponse.json(
      { error: "playerId et targetId requis" },
      { status: 400 }
    );
  }

  const supabase = createClient();

  // Get game
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, status, current_phase")
    .eq("code", code)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: "Partie non trouvée" }, { status: 404 });
  }

  if (game.status !== "nuit") {
    return NextResponse.json(
      { error: "L'assassinat ne peut avoir lieu que la nuit" },
      { status: 400 }
    );
  }

  // Verify player is the assassin and alive
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, is_alive, role:roles(id, name)")
    .eq("id", playerId)
    .eq("game_id", game.id)
    .single();

  if (playerError || !player) {
    return NextResponse.json({ error: "Joueur non trouvé" }, { status: 404 });
  }

  if (!player.is_alive) {
    return NextResponse.json(
      { error: "Les morts ne peuvent pas utiliser de pouvoir" },
      { status: 400 }
    );
  }

  const playerRole = player.role as { id: string; name: string } | null;
  if (!playerRole || playerRole.name !== "assassin") {
    return NextResponse.json(
      { error: "Seul l'assassin peut utiliser ce pouvoir" },
      { status: 403 }
    );
  }

  // Get the assassin power
  const { data: power } = await supabase
    .from("powers")
    .select("id, uses_per_game")
    .eq("role_id", playerRole.id)
    .eq("name", "assassinate")
    .single();

  if (!power) {
    return NextResponse.json({ error: "Pouvoir non trouvé" }, { status: 404 });
  }

  // Check if already used (only 1 use per game)
  const { data: existingUses } = await supabase
    .from("power_uses")
    .select("id")
    .eq("game_id", game.id)
    .eq("player_id", playerId)
    .eq("power_id", power.id);

  if (existingUses && existingUses.length >= (power.uses_per_game ?? 1)) {
    return NextResponse.json(
      { error: "Vous avez déjà utilisé votre pouvoir d'assassinat" },
      { status: 400 }
    );
  }

  // Verify target is alive and not self
  const { data: target, error: targetError } = await supabase
    .from("players")
    .select("id, pseudo, is_alive, is_mj")
    .eq("id", targetId)
    .eq("game_id", game.id)
    .single();

  if (targetError || !target) {
    return NextResponse.json({ error: "Cible non trouvée" }, { status: 404 });
  }

  if (!target.is_alive || target.is_mj) {
    return NextResponse.json(
      { error: "Cible invalide" },
      { status: 400 }
    );
  }

  if (targetId === playerId) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas vous assassiner vous-même" },
      { status: 400 }
    );
  }

  // Kill the target immediately (the assassination happens silently)
  await supabase
    .from("players")
    .update({
      is_alive: false,
      death_reason: "assassiné",
      death_at: new Date().toISOString(),
    })
    .eq("id", targetId);

  // Record power use
  await supabase.from("power_uses").insert({
    game_id: game.id,
    player_id: playerId,
    power_id: power.id,
    target_id: targetId,
    phase: game.current_phase ?? 1,
    result: {
      target_name: target.pseudo,
      action: "assassinate",
      success: true,
    },
  });

  // Log the event (private - not revealed to other players)
  await supabase.from("game_events").insert({
    game_id: game.id,
    event_type: "power_used",
    actor_id: playerId,
    target_id: targetId,
    data: {
      power: "assassinate",
      secret: true, // This kill is indétectable
    },
  });

  // Also log the death (will be revealed at dawn, but cause is unknown)
  await supabase.from("game_events").insert({
    game_id: game.id,
    event_type: "player_killed",
    target_id: targetId,
    data: {
      reason: "assassiné",
      phase: game.current_phase,
      mystery: true, // The cause is mysterious
    },
  });

  return NextResponse.json({
    success: true,
    result: {
      targetName: target.pseudo,
      message: `🗡️ Vous avez assassiné ${target.pseudo}. Personne ne saura que c'est vous...`,
    },
  });
}

// GET - Get assassin's power status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get("playerId");

  if (!playerId) {
    return NextResponse.json(
      { error: "playerId requis" },
      { status: 400 }
    );
  }

  const supabase = createClient();

  // Get game
  const { data: game } = await supabase
    .from("games")
    .select("id, current_phase")
    .eq("code", code)
    .single();

  if (!game) {
    return NextResponse.json({ error: "Partie non trouvée" }, { status: 404 });
  }

  // Get player's role
  const { data: player } = await supabase
    .from("players")
    .select("role:roles(id, name)")
    .eq("id", playerId)
    .eq("game_id", game.id)
    .single();

  const playerRole = player?.role as { id: string; name: string } | null;
  if (!playerRole || playerRole.name !== "assassin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Get power
  const { data: power } = await supabase
    .from("powers")
    .select("id, uses_per_game")
    .eq("role_id", playerRole.id)
    .eq("name", "assassinate")
    .single();

  // Get power uses
  const { data: powerUses } = await supabase
    .from("power_uses")
    .select("id, phase, result, target:players!target_id(pseudo)")
    .eq("game_id", game.id)
    .eq("player_id", playerId)
    .eq("power_id", power?.id ?? "");

  const usesRemaining = (power?.uses_per_game ?? 1) - (powerUses?.length ?? 0);

  return NextResponse.json({
    powerUsed: usesRemaining <= 0,
    usesRemaining,
    history: powerUses || [],
    currentPhase: game.current_phase ?? 1,
  });
}
