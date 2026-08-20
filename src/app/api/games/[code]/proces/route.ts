/**
 * Procès d'avant-partie — « tête de traître ».
 *
 * Au lobby, avant même la distribution des rôles, chacun désigne en secret
 * celui qui a « une tête de traître ». Aucun effet sur la partie : le verdict
 * tombe au récap de fin (« Délit de faciès ») quand les rôles sont révélés —
 * coupable 🐺 ou innocenté 🐑. Stocké dans votes avec vote_type 'pouvoir' et
 * phase 0 (les intuitions de nuit occupent les phases >= 1).
 */

import { createClient } from "@/lib/supabase/client";
import { NextRequest, NextResponse } from "next/server";
import { isAutoMode } from "@/lib/game/resolution";

const PROCES_PHASE = 0;

// POST - Désigner (ou changer) sa tête de traître au lobby
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { playerId, targetId } = body as { playerId?: string; targetId?: string };

  if (!playerId || !targetId) {
    return NextResponse.json(
      { error: "playerId et targetId requis" },
      { status: 400 }
    );
  }

  const supabase = createClient();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, status, settings")
    .eq("code", code)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: "Partie non trouvée" }, { status: 404 });
  }

  if (game.status !== "lobby") {
    return NextResponse.json(
      { error: "Le procès se tient avant la partie, au lobby" },
      { status: 400 }
    );
  }

  const autoMode = isAutoMode(game.settings);

  const { data: voter, error: voterError } = await supabase
    .from("players")
    .select("id, is_mj")
    .eq("id", playerId)
    .eq("game_id", game.id)
    .single();

  if (voterError || !voter) {
    return NextResponse.json({ error: "Joueur non trouvé" }, { status: 404 });
  }

  if (voter.is_mj && !autoMode) {
    return NextResponse.json({ error: "Le MJ arbitre ne joue pas" }, { status: 403 });
  }

  if (targetId === playerId) {
    return NextResponse.json(
      { error: "S'accuser soi-même, c'est louche mais interdit" },
      { status: 400 }
    );
  }

  const { data: target, error: targetError } = await supabase
    .from("players")
    .select("id, is_mj")
    .eq("id", targetId)
    .eq("game_id", game.id)
    .single();

  if (targetError || !target) {
    return NextResponse.json({ error: "Cible non trouvée" }, { status: 404 });
  }

  if (target.is_mj && !autoMode) {
    return NextResponse.json({ error: "Cible invalide" }, { status: 400 });
  }

  // Upsert : une accusation par joueur, modifiable tant qu'on est au lobby
  const { data: existing } = await supabase
    .from("votes")
    .select("id")
    .eq("game_id", game.id)
    .eq("voter_id", playerId)
    .eq("vote_type", "pouvoir")
    .eq("phase", PROCES_PHASE)
    .maybeSingle();

  if (existing) {
    const { error: updateError } = await supabase
      .from("votes")
      .update({ target_id: targetId })
      .eq("id", existing.id);
    if (updateError) {
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour de l'accusation" },
        { status: 500 }
      );
    }
  } else {
    const { error: insertError } = await supabase.from("votes").insert({
      game_id: game.id,
      voter_id: playerId,
      target_id: targetId,
      vote_type: "pouvoir",
      phase: PROCES_PHASE,
    });
    if (insertError) {
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement de l'accusation" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}

// GET - Nombre d'accusations déposées + la sienne (restauration d'écran).
// Ne révèle jamais qui accuse qui : le verdict attend le récap de fin.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get("playerId");

  const supabase = createClient();

  const { data: game } = await supabase
    .from("games")
    .select("id")
    .eq("code", code)
    .single();

  if (!game) {
    return NextResponse.json({ error: "Partie non trouvée" }, { status: 404 });
  }

  const { data: votes, error: votesError } = await supabase
    .from("votes")
    .select("voter_id, target_id")
    .eq("game_id", game.id)
    .eq("vote_type", "pouvoir")
    .eq("phase", PROCES_PHASE);

  if (votesError) {
    return NextResponse.json(
      { error: "Erreur lors de la lecture du procès" },
      { status: 500 }
    );
  }

  const own = playerId
    ? (votes ?? []).find((v) => v.voter_id === playerId)
    : undefined;

  return NextResponse.json({
    count: (votes ?? []).length,
    targetId: own?.target_id ?? null,
  });
}
