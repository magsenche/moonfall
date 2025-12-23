import { createClient } from "@/lib/supabase/client";
import { NextRequest, NextResponse } from "next/server";

// POST - Voyante uses her power to see a player's role
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

  // Verify player is the voyante and alive
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
  if (!playerRole || playerRole.name !== "voyante") {
    return NextResponse.json(
      { error: "Seule la voyante peut utiliser ce pouvoir" },
      { status: 403 }
    );
  }

  // Get the voyante power
  const { data: power } = await supabase
    .from("powers")
    .select("id")
    .eq("role_id", playerRole.id)
    .eq("name", "voir_role")
    .single();

  if (!power) {
    return NextResponse.json({ error: "Pouvoir non trouvé" }, { status: 404 });
  }

  // Check if already used this phase
  const { data: existingUse } = await supabase
    .from("power_uses")
    .select("id")
    .eq("game_id", game.id)
    .eq("player_id", playerId)
    .eq("power_id", power.id)
    .eq("phase", game.current_phase ?? 1);

  if (existingUse && existingUse.length > 0) {
    return NextResponse.json(
      { error: "Vous avez déjà utilisé votre pouvoir cette nuit" },
      { status: 400 }
    );
  }

  // Verify target is alive and not self
  const { data: target, error: targetError } = await supabase
    .from("players")
    .select("id, pseudo, is_alive, is_mj, role:roles(name, team)")
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
      { error: "Vous ne pouvez pas vous sonder vous-même" },
      { status: 400 }
    );
  }

  const targetRole = target.role as { name: string; team: string } | null;

  // Record power use
  await supabase.from("power_uses").insert({
    game_id: game.id,
    player_id: playerId,
    power_id: power.id,
    target_id: targetId,
    phase: game.current_phase ?? 1,
    result: {
      target_name: target.pseudo,
      role_name: targetRole?.name,
      team: targetRole?.team,
    },
  });

  // Log the event (without revealing the result to others)
  await supabase.from("game_events").insert({
    game_id: game.id,
    event_type: "power_used",
    data: {
      player_id: playerId,
      power: "voir_role",
      target_id: targetId,
    },
  });

  return NextResponse.json({
    success: true,
    result: {
      targetName: target.pseudo,
      roleName: targetRole?.name,
      team: targetRole?.team,
    },
  });
}

// GET - Get voyante's power uses for this game (to show history)
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

  // Get power uses for this voyante
  const { data: powerUses } = await supabase
    .from("power_uses")
    .select("id, phase, result, created_at, target:players!target_id(pseudo)")
    .eq("game_id", game.id)
    .eq("player_id", playerId)
    .order("phase", { ascending: true });

  // Check if already used this phase
  const usedThisPhase = powerUses?.some(
    (pu) => pu.phase === (game.current_phase ?? 1)
  );

  return NextResponse.json({
    powerUses: powerUses || [],
    usedThisPhase,
    currentPhase: game.current_phase ?? 1,
  });
}
