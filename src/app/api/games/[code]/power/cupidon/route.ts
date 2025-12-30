import { createClient } from "@/lib/supabase/client";
import { NextRequest, NextResponse } from "next/server";

// GET - Get Cupidon's lovers status
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
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id")
    .eq("code", code)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: "Partie non trouvée" }, { status: 404 });
  }

  // Get existing lovers pair for this game
  const { data: lovers } = await supabase
    .from("lovers")
    .select(`
      id,
      player1_id,
      player2_id
    `)
    .eq("game_id", game.id)
    .maybeSingle();

  if (!lovers) {
    return NextResponse.json({
      hasChosenLovers: false,
      lover1Id: null,
      lover1Name: null,
      lover2Id: null,
      lover2Name: null,
      isLover: false,
      partnerPlayerId: null,
      partnerPlayerName: null,
    });
  }

  // Get player names
  const { data: players } = await supabase
    .from("players")
    .select("id, pseudo")
    .in("id", [lovers.player1_id, lovers.player2_id]);

  const player1 = players?.find(p => p.id === lovers.player1_id);
  const player2 = players?.find(p => p.id === lovers.player2_id);

  // Check if current player is one of the lovers
  const isLover = playerId === lovers.player1_id || playerId === lovers.player2_id;
  let partnerPlayerId: string | null = null;
  let partnerPlayerName: string | null = null;

  if (isLover) {
    if (playerId === lovers.player1_id) {
      partnerPlayerId = lovers.player2_id;
      partnerPlayerName = player2?.pseudo || null;
    } else {
      partnerPlayerId = lovers.player1_id;
      partnerPlayerName = player1?.pseudo || null;
    }
  }

  return NextResponse.json({
    hasChosenLovers: true,
    lover1Id: lovers.player1_id,
    lover1Name: player1?.pseudo || null,
    lover2Id: lovers.player2_id,
    lover2Name: player2?.pseudo || null,
    isLover,
    partnerPlayerId,
    partnerPlayerName,
  });
}

// POST - Cupidon chooses two lovers at the start of the game
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { playerId, lover1Id, lover2Id } = body;

  if (!playerId || !lover1Id || !lover2Id) {
    return NextResponse.json(
      { error: "playerId, lover1Id et lover2Id requis" },
      { status: 400 }
    );
  }

  if (lover1Id === lover2Id) {
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

  // Can only choose lovers at start of game (first day or first night)
  // Allow during first night, first day, or even lobby (after roles distributed but before game starts moving)
  const phase = game.current_phase ?? 0;
  if (phase > 1 && game.status !== 'nuit' && game.status !== 'jour') {
    return NextResponse.json(
      { error: "Vous ne pouvez choisir les amoureux qu'au début de la partie" },
      { status: 400 }
    );
  }

  // Verify player is Cupidon and alive
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
  if (!playerRole || playerRole.name !== "cupidon") {
    return NextResponse.json(
      { error: "Seul Cupidon peut désigner les amoureux" },
      { status: 403 }
    );
  }

  // Check if already has chosen lovers
  const { data: existingLovers } = await supabase
    .from("lovers")
    .select("id")
    .eq("game_id", game.id);

  if (existingLovers && existingLovers.length > 0) {
    return NextResponse.json(
      { error: "Vous avez déjà choisi les amoureux" },
      { status: 400 }
    );
  }

  // Verify both lovers exist and are alive
  const { data: lover1, error: lover1Error } = await supabase
    .from("players")
    .select("id, pseudo, is_alive, is_mj")
    .eq("id", lover1Id)
    .eq("game_id", game.id)
    .single();

  const { data: lover2, error: lover2Error } = await supabase
    .from("players")
    .select("id, pseudo, is_alive, is_mj")
    .eq("id", lover2Id)
    .eq("game_id", game.id)
    .single();

  if (lover1Error || !lover1 || lover2Error || !lover2) {
    return NextResponse.json(
      { error: "Joueur(s) non trouvé(s)" },
      { status: 404 }
    );
  }

  if (lover1.is_mj || lover2.is_mj) {
    return NextResponse.json(
      { error: "Le MJ ne peut pas être amoureux" },
      { status: 400 }
    );
  }

  // Insert lovers pair
  const { error: insertError } = await supabase
    .from("lovers")
    .insert({
      game_id: game.id,
      player1_id: lover1Id,
      player2_id: lover2Id,
    });

  if (insertError) {
    console.error("Error inserting lovers:", insertError);
    return NextResponse.json(
      { error: "Erreur lors de la création du couple" },
      { status: 500 }
    );
  }

  // Get the lien_amoureux power id
  const { data: power } = await supabase
    .from("powers")
    .select("id")
    .eq("role_id", playerRole.id)
    .eq("name", "lien_amoureux")
    .single();

  // Record power use
  if (power) {
    await supabase.from("power_uses").insert({
      game_id: game.id,
      player_id: playerId,
      power_id: power.id,
      phase: game.current_phase ?? 1,
      result: { lover1_id: lover1Id, lover2_id: lover2Id },
    });
  }

  // Log event
  await supabase.from("game_events").insert({
    game_id: game.id,
    event_type: "cupidon_lovers_chosen",
    actor_id: playerId,
    data: {
      lover1_id: lover1Id,
      lover1_name: lover1.pseudo,
      lover2_id: lover2Id,
      lover2_name: lover2.pseudo,
    },
  });

  return NextResponse.json({
    success: true,
    lover1: {
      id: lover1Id,
      pseudo: lover1.pseudo,
    },
    lover2: {
      id: lover2Id,
      pseudo: lover2.pseudo,
    },
  });
}
