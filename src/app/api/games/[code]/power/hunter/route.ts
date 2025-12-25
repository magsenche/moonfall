import { createClient } from "@/lib/supabase/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST - Chasseur uses his final shot when he dies
 * This is called when the hunter dies (either by vote or wolf attack)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { hunterId, targetId } = body;

  if (!hunterId || !targetId) {
    return NextResponse.json(
      { error: "hunterId et targetId requis" },
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

  // Verify player is the chasseur and DEAD (just died)
  const { data: hunter, error: hunterError } = await supabase
    .from("players")
    .select("id, is_alive, pseudo, role:roles(id, name)")
    .eq("id", hunterId)
    .eq("game_id", game.id)
    .single();

  if (hunterError || !hunter) {
    return NextResponse.json({ error: "Chasseur non trouvé" }, { status: 404 });
  }

  const hunterRole = hunter.role as { id: string; name: string } | null;
  if (!hunterRole || hunterRole.name !== "chasseur") {
    return NextResponse.json(
      { error: "Seul le chasseur peut utiliser ce pouvoir" },
      { status: 403 }
    );
  }

  // Hunter must be dead to use this power (just died)
  if (hunter.is_alive) {
    return NextResponse.json(
      { error: "Le chasseur doit être mort pour utiliser son pouvoir" },
      { status: 400 }
    );
  }

  // Get the tir_mortel power
  const { data: power } = await supabase
    .from("powers")
    .select("id")
    .eq("role_id", hunterRole.id)
    .eq("name", "tir_mortel")
    .single();

  if (!power) {
    return NextResponse.json({ error: "Pouvoir non trouvé" }, { status: 404 });
  }

  // Check if already used (should only be usable once)
  const { data: existingUse } = await supabase
    .from("power_uses")
    .select("id")
    .eq("game_id", game.id)
    .eq("player_id", hunterId)
    .eq("power_id", power.id);

  if (existingUse && existingUse.length > 0) {
    return NextResponse.json(
      { error: "Vous avez déjà utilisé votre tir mortel" },
      { status: 400 }
    );
  }

  // Verify target is alive and not the hunter themselves
  const { data: target, error: targetError } = await supabase
    .from("players")
    .select("id, pseudo, is_alive, is_mj, role:roles(name, team)")
    .eq("id", targetId)
    .eq("game_id", game.id)
    .single();

  if (targetError || !target) {
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

  if (targetId === hunterId) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas vous cibler vous-même" },
      { status: 400 }
    );
  }

  // Kill the target
  const { error: killError } = await supabase
    .from("players")
    .update({
      is_alive: false,
      death_reason: "chasseur",
      death_at: new Date().toISOString(),
    })
    .eq("id", targetId);

  if (killError) {
    return NextResponse.json(
      { error: "Erreur lors du tir" },
      { status: 500 }
    );
  }

  // Record power use
  const targetRole = target.role as { name: string; team: string } | null;
  await supabase.from("power_uses").insert({
    game_id: game.id,
    player_id: hunterId,
    power_id: power.id,
    target_id: targetId,
    phase: game.current_phase ?? 1,
    result: {
      target_name: target.pseudo,
      target_role: targetRole?.name,
    },
  });

  // Log the event
  await supabase.from("game_events").insert({
    game_id: game.id,
    event_type: "hunter_shot",
    data: {
      hunter_id: hunterId,
      hunter_name: hunter.pseudo,
      target_id: targetId,
      target_name: target.pseudo,
      target_role: targetRole?.name,
    },
  });

  // Check victory conditions after the shot
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

  let winner: "village" | "loups" | null = null;

  if (remainingWolves.length === 0) {
    winner = "village";
  } else if (remainingWolves.length >= remainingVillagers.length) {
    winner = "loups";
  }

  if (winner) {
    // Game over
    await supabase
      .from("games")
      .update({ status: "terminee", winner })
      .eq("id", game.id);

    await supabase.from("game_events").insert({
      game_id: game.id,
      event_type: "game_ended",
      data: { winner, by_hunter_shot: true },
    });

    return NextResponse.json({
      success: true,
      target: target.pseudo,
      targetRole: targetRole?.name,
      gameOver: true,
      winner,
    });
  }

  return NextResponse.json({
    success: true,
    target: target.pseudo,
    targetRole: targetRole?.name,
    gameOver: false,
  });
}
