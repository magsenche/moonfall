/**
 * Choix d'avatar au lobby : chaque joueur pique un emoji dans la grille
 * (AVATAR_CHOICES) et tout le monde le voit apparaître. Stocké dans
 * players.avatar_url — la colonne existait déjà pour ça.
 */

import { createClient } from "@/lib/supabase/client";
import { NextRequest, NextResponse } from "next/server";
import { isAvatarChoice } from "@/config/players";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { playerId, avatar } = body as { playerId?: string; avatar?: string };

  if (!playerId || !avatar) {
    return NextResponse.json({ error: "playerId et avatar requis" }, { status: 400 });
  }

  if (!isAvatarChoice(avatar)) {
    return NextResponse.json({ error: "Avatar inconnu" }, { status: 400 });
  }

  const supabase = createClient();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, status")
    .eq("code", code)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: "Partie non trouvée" }, { status: 404 });
  }

  // Choix au lobby uniquement : en partie, les avatars sont des repères
  if (game.status !== "lobby") {
    return NextResponse.json(
      { error: "L'avatar se choisit dans le lobby" },
      { status: 400 }
    );
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .update({ avatar_url: avatar })
    .eq("id", playerId)
    .eq("game_id", game.id)
    .select("id")
    .maybeSingle();

  if (playerError || !player) {
    return NextResponse.json({ error: "Joueur non trouvé" }, { status: 404 });
  }

  return NextResponse.json({ success: true, avatar });
}
