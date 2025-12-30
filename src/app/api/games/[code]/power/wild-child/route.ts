import { createClient } from "@/lib/supabase/client";
import { NextRequest, NextResponse } from "next/server";

// POST - Enfant Sauvage chooses his model at the start of the game
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { playerId, modelId } = body;

  if (!playerId || !modelId) {
    return NextResponse.json(
      { error: "playerId et modelId requis" },
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

  // Can only choose model at start or during first day
  if (game.status !== "jour" || (game.current_phase ?? 0) > 1) {
    return NextResponse.json(
      { error: "Vous ne pouvez choisir votre modèle qu'au début de la partie" },
      { status: 400 }
    );
  }

  // Verify player is the enfant sauvage and alive
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
  if (!playerRole || playerRole.name !== "enfant_sauvage") {
    return NextResponse.json(
      { error: "Seul l'Enfant Sauvage peut choisir un modèle" },
      { status: 403 }
    );
  }

  // Check if already has a model
  const { data: existingModel } = await supabase
    .from("wild_child_models")
    .select("id")
    .eq("game_id", game.id)
    .eq("child_player_id", playerId);

  if (existingModel && existingModel.length > 0) {
    return NextResponse.json(
      { error: "Vous avez déjà choisi votre modèle" },
      { status: 400 }
    );
  }

  // Can't choose yourself
  if (modelId === playerId) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas vous choisir comme modèle" },
      { status: 400 }
    );
  }

  // Verify model is alive and valid
  const { data: model, error: modelError } = await supabase
    .from("players")
    .select("id, pseudo, is_alive, is_mj")
    .eq("id", modelId)
    .eq("game_id", game.id)
    .single();

  if (modelError || !model) {
    return NextResponse.json({ error: "Modèle non trouvé" }, { status: 404 });
  }

  if (!model.is_alive || model.is_mj) {
    return NextResponse.json(
      { error: "Modèle invalide" },
      { status: 400 }
    );
  }

  // Get the power
  const { data: power } = await supabase
    .from("powers")
    .select("id")
    .eq("role_id", playerRole.id)
    .eq("name", "choose_model")
    .single();

  // Record model choice
  await supabase.from("wild_child_models").insert({
    game_id: game.id,
    child_player_id: playerId,
    model_player_id: modelId,
    transformed: false,
  });

  // Record power use
  if (power) {
    await supabase.from("power_uses").insert({
      game_id: game.id,
      player_id: playerId,
      power_id: power.id,
      target_id: modelId,
      phase: game.current_phase ?? 1,
      result: {
        model_name: model.pseudo,
        action: "choose_model",
      },
    });
  }

  // Log the event (secret)
  await supabase.from("game_events").insert({
    game_id: game.id,
    event_type: "power_used",
    actor_id: playerId,
    target_id: modelId,
    data: {
      power: "choose_model",
      secret: true, // Model doesn't know they were chosen
    },
  });

  return NextResponse.json({
    success: true,
    result: {
      modelName: model.pseudo,
      message: `🐺👶 ${model.pseudo} est maintenant votre modèle. Tant qu'il vit, vous êtes du côté du Village. S'il meurt... vous deviendrez Loup-Garou !`,
    },
  });
}

// GET - Get enfant sauvage's model status
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
  
  // Allow both enfant_sauvage and loup_garou (in case they transformed)
  const isWildChild = playerRole?.name === "enfant_sauvage";
  const isTransformedWolf = playerRole?.name === "loup_garou";

  // Get model info
  const { data: modelInfo } = await supabase
    .from("wild_child_models")
    .select(`
      model_player_id,
      transformed,
      model:players!model_player_id(pseudo, is_alive)
    `)
    .eq("game_id", game.id)
    .eq("child_player_id", playerId)
    .single();

  if (!modelInfo) {
    return NextResponse.json({
      hasModel: false,
      needsToChoose: isWildChild && (game.current_phase ?? 0) <= 1,
      currentPhase: game.current_phase ?? 1,
    });
  }

  const model = modelInfo.model as { pseudo: string; is_alive: boolean } | null;

  return NextResponse.json({
    hasModel: true,
    model: {
      playerId: modelInfo.model_player_id,
      pseudo: model?.pseudo,
      isAlive: model?.is_alive,
    },
    transformed: modelInfo.transformed,
    currentPhase: game.current_phase ?? 1,
  });
}
