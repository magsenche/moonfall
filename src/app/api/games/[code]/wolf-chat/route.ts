import { createClient } from "@/lib/supabase/client";
import { NextRequest, NextResponse } from "next/server";

// GET - Get wolf chat messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
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

  // Get messages with player info
  const { data: messages, error } = await supabase
    .from("wolf_chat")
    .select("id, message, created_at, player:players(id, pseudo)")
    .eq("game_id", game.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Erreur lors de la récupération des messages" },
      { status: 500 }
    );
  }

  return NextResponse.json({ messages });
}

// POST - Send a wolf chat message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { playerId, message } = body;

  if (!playerId || !message?.trim()) {
    return NextResponse.json(
      { error: "playerId et message requis" },
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

  if (game.status === "lobby" || game.status === "terminee") {
    return NextResponse.json(
      { error: "La partie n'est pas en cours" },
      { status: 400 }
    );
  }

  // Verify player is a wolf and alive
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, is_alive, role:roles(team)")
    .eq("id", playerId)
    .eq("game_id", game.id)
    .single();

  if (playerError || !player) {
    return NextResponse.json({ error: "Joueur non trouvé" }, { status: 404 });
  }

  if (!player.is_alive) {
    return NextResponse.json(
      { error: "Les morts ne parlent pas" },
      { status: 400 }
    );
  }

  const playerRole = player.role as { team: string } | null;
  if (!playerRole || playerRole.team !== "loups") {
    return NextResponse.json(
      { error: "Seuls les loups peuvent utiliser ce chat" },
      { status: 403 }
    );
  }

  // Insert message
  const { data: newMessage, error: insertError } = await supabase
    .from("wolf_chat")
    .insert({
      game_id: game.id,
      player_id: playerId,
      message: message.trim(),
    })
    .select("id, message, created_at")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: "Erreur lors de l'envoi du message" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, message: newMessage });
}
