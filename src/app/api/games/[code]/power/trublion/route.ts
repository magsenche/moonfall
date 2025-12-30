import { createClient } from "@/lib/supabase/client";
import { NextRequest, NextResponse } from "next/server";

// POST - Trublion uses his power to swap two players' roles
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { playerId, target1Id, target2Id } = body;

  if (!playerId || !target1Id || !target2Id) {
    return NextResponse.json(
      { error: "playerId, target1Id et target2Id requis" },
      { status: 400 }
    );
  }

  if (target1Id === target2Id) {
    return NextResponse.json(
      { error: "Vous devez choisir deux joueurs différents" },
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

  // Verify player is the trublion and alive
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
  if (!playerRole || playerRole.name !== "trublion") {
    return NextResponse.json(
      { error: "Seul le trublion peut utiliser ce pouvoir" },
      { status: 403 }
    );
  }

  // Get the trublion power
  const { data: power } = await supabase
    .from("powers")
    .select("id, uses_per_game")
    .eq("role_id", playerRole.id)
    .eq("name", "swap_roles")
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
      { error: "Vous avez déjà utilisé votre pouvoir d'échange" },
      { status: 400 }
    );
  }

  // Can't swap yourself
  if (target1Id === playerId || target2Id === playerId) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas vous inclure dans l'échange" },
      { status: 400 }
    );
  }

  // Get both targets
  const { data: target1, error: target1Error } = await supabase
    .from("players")
    .select("id, pseudo, is_alive, is_mj, role_id, role:roles(name)")
    .eq("id", target1Id)
    .eq("game_id", game.id)
    .single();

  const { data: target2, error: target2Error } = await supabase
    .from("players")
    .select("id, pseudo, is_alive, is_mj, role_id, role:roles(name)")
    .eq("id", target2Id)
    .eq("game_id", game.id)
    .single();

  if (target1Error || !target1 || target2Error || !target2) {
    return NextResponse.json({ error: "Cible(s) non trouvée(s)" }, { status: 404 });
  }

  if (!target1.is_alive || !target2.is_alive) {
    return NextResponse.json(
      { error: "Les deux cibles doivent être vivantes" },
      { status: 400 }
    );
  }

  if (target1.is_mj || target2.is_mj) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas échanger le rôle du MJ" },
      { status: 400 }
    );
  }

  // Swap the roles!
  const role1Id = target1.role_id;
  const role2Id = target2.role_id;

  await supabase
    .from("players")
    .update({ role_id: role2Id })
    .eq("id", target1Id);

  await supabase
    .from("players")
    .update({ role_id: role1Id })
    .eq("id", target2Id);

  const target1Role = target1.role as { name: string } | null;
  const target2Role = target2.role as { name: string } | null;

  // Record power use
  await supabase.from("power_uses").insert({
    game_id: game.id,
    player_id: playerId,
    power_id: power.id,
    target_id: target1Id, // Primary target
    phase: game.current_phase ?? 1,
    result: {
      target1_name: target1.pseudo,
      target1_old_role: target1Role?.name,
      target2_name: target2.pseudo,
      target2_old_role: target2Role?.name,
      action: "swap_roles",
    },
  });

  // Log the event (secret - players don't know immediately)
  await supabase.from("game_events").insert({
    game_id: game.id,
    event_type: "power_used",
    actor_id: playerId,
    data: {
      power: "swap_roles",
      target1_id: target1Id,
      target2_id: target2Id,
      secret: true, // Players don't know until they try to use their power
    },
  });

  return NextResponse.json({
    success: true,
    result: {
      target1Name: target1.pseudo,
      target2Name: target2.pseudo,
      message: `🃏 Chaos ! ${target1.pseudo} et ${target2.pseudo} ont échangé leurs rôles. Ils ne le savent pas encore...`,
    },
  });
}

// GET - Get trublion's power status
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
  if (!playerRole || playerRole.name !== "trublion") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Get power
  const { data: power } = await supabase
    .from("powers")
    .select("id, uses_per_game")
    .eq("role_id", playerRole.id)
    .eq("name", "swap_roles")
    .single();

  // Get power uses
  const { data: powerUses } = await supabase
    .from("power_uses")
    .select("id, phase, result")
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
