import { createClient } from "@/lib/supabase/client";
import { NextRequest, NextResponse } from "next/server";

// POST - Salvateur uses his power to protect a player
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
      { error: "Le pouvoir ne peut être utilisé que la nuit" },
      { status: 400 }
    );
  }

  // Verify player is the salvateur and alive
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
  if (!playerRole || playerRole.name !== "salvateur") {
    return NextResponse.json(
      { error: "Seul le salvateur peut utiliser ce pouvoir" },
      { status: 403 }
    );
  }

  // Get the salvateur power
  const { data: power } = await supabase
    .from("powers")
    .select("id")
    .eq("role_id", playerRole.id)
    .eq("name", "protect")
    .single();

  if (!power) {
    return NextResponse.json({ error: "Pouvoir non trouvé" }, { status: 404 });
  }

  // Check if already used this phase
  const { data: existingProtection } = await supabase
    .from("salvateur_protections")
    .select("id")
    .eq("game_id", game.id)
    .eq("salvateur_player_id", playerId)
    .eq("phase", game.current_phase ?? 1);

  if (existingProtection && existingProtection.length > 0) {
    return NextResponse.json(
      { error: "Vous avez déjà protégé quelqu'un cette nuit" },
      { status: 400 }
    );
  }

  // Check if trying to protect the same person as last night
  const { data: lastProtection } = await supabase
    .from("salvateur_protections")
    .select("protected_player_id")
    .eq("game_id", game.id)
    .eq("salvateur_player_id", playerId)
    .eq("phase", (game.current_phase ?? 1) - 1)
    .single();

  if (lastProtection && lastProtection.protected_player_id === targetId) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas protéger la même personne deux nuits de suite" },
      { status: 400 }
    );
  }

  // Verify target is alive
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

  // Record protection
  await supabase.from("salvateur_protections").insert({
    game_id: game.id,
    salvateur_player_id: playerId,
    protected_player_id: targetId,
    phase: game.current_phase ?? 1,
  });

  // Record power use
  await supabase.from("power_uses").insert({
    game_id: game.id,
    player_id: playerId,
    power_id: power.id,
    target_id: targetId,
    phase: game.current_phase ?? 1,
    result: {
      target_name: target.pseudo,
      action: "protect",
    },
  });

  // Log the event
  await supabase.from("game_events").insert({
    game_id: game.id,
    event_type: "power_used",
    actor_id: playerId,
    target_id: targetId,
    data: {
      power: "protect",
    },
  });

  return NextResponse.json({
    success: true,
    result: {
      targetName: target.pseudo,
      message: `🛡️ Vous protégez ${target.pseudo} cette nuit`,
    },
  });
}

// GET - Get salvateur's protection status
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

  // Get current protection
  const { data: currentProtection } = await supabase
    .from("salvateur_protections")
    .select("protected_player_id, players!protected_player_id(pseudo)")
    .eq("game_id", game.id)
    .eq("salvateur_player_id", playerId)
    .eq("phase", game.current_phase ?? 1)
    .single();

  // Get last night's protection (to prevent same target)
  const { data: lastProtection } = await supabase
    .from("salvateur_protections")
    .select("protected_player_id")
    .eq("game_id", game.id)
    .eq("salvateur_player_id", playerId)
    .eq("phase", (game.current_phase ?? 1) - 1)
    .single();

  return NextResponse.json({
    usedThisPhase: !!currentProtection,
    currentProtection: currentProtection ? {
      playerId: currentProtection.protected_player_id,
      pseudo: (currentProtection.players as { pseudo: string } | null)?.pseudo,
    } : null,
    lastProtectedPlayerId: lastProtection?.protected_player_id || null,
    currentPhase: game.current_phase ?? 1,
  });
}
