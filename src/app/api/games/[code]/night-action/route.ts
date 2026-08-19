/**
 * Intuition de nuit — l'action nocturne des joueurs sans pouvoir.
 *
 * Chaque non-loup désigne en secret qui il soupçonne. Sans effet sur la
 * partie : l'intuition sert à ce que TOUS les téléphones soient actifs la
 * nuit (sinon, celui qui tapote est un loup) et nourrit le récap de fin
 * (« Flair du village »). Stockée dans votes avec vote_type 'pouvoir'.
 */

import { createClient } from "@/lib/supabase/client";
import { NextRequest, NextResponse } from "next/server";
import { isAutoMode } from "@/lib/game/resolution";

// POST - Soumettre (ou changer) son intuition de la nuit
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
    .select("id, status, current_phase, settings")
    .eq("code", code)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: "Partie non trouvée" }, { status: 404 });
  }

  if (game.status !== "nuit") {
    return NextResponse.json(
      { error: "L'intuition ne se confie que la nuit" },
      { status: 400 }
    );
  }

  const autoMode = isAutoMode(game.settings);

  // Voter : vivant, dans la partie, pas un loup (eux votent déjà pour dévorer)
  const { data: voter, error: voterError } = await supabase
    .from("players")
    .select("id, is_alive, is_mj, role:roles(team)")
    .eq("id", playerId)
    .eq("game_id", game.id)
    .single();

  if (voterError || !voter) {
    return NextResponse.json({ error: "Joueur non trouvé" }, { status: 404 });
  }

  if (!voter.is_alive) {
    return NextResponse.json(
      { error: "Les morts ne confient plus leurs intuitions" },
      { status: 400 }
    );
  }

  if (voter.is_mj && !autoMode) {
    return NextResponse.json({ error: "Le MJ arbitre ne joue pas" }, { status: 403 });
  }

  if ((voter.role as { team: string } | null)?.team === "loups") {
    return NextResponse.json(
      { error: "Les loups ont déjà leur vote de meute" },
      { status: 400 }
    );
  }

  // Cible : vivante, différente de soi, MJ ciblable qu'en Auto-Garou
  if (targetId === playerId) {
    return NextResponse.json(
      { error: "Se soupçonner soi-même n'aide personne" },
      { status: 400 }
    );
  }

  const { data: target, error: targetError } = await supabase
    .from("players")
    .select("id, is_alive, is_mj")
    .eq("id", targetId)
    .eq("game_id", game.id)
    .single();

  if (targetError || !target) {
    return NextResponse.json({ error: "Cible non trouvée" }, { status: 404 });
  }

  if (!target.is_alive || (target.is_mj && !autoMode)) {
    return NextResponse.json({ error: "Cible invalide" }, { status: 400 });
  }

  // Upsert : une intuition par joueur et par nuit, modifiable
  const phase = game.current_phase ?? 1;
  const { data: existing } = await supabase
    .from("votes")
    .select("id")
    .eq("game_id", game.id)
    .eq("voter_id", playerId)
    .eq("vote_type", "pouvoir")
    .eq("phase", phase)
    .maybeSingle();

  if (existing) {
    const { error: updateError } = await supabase
      .from("votes")
      .update({ target_id: targetId })
      .eq("id", existing.id);
    if (updateError) {
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour de l'intuition" },
        { status: 500 }
      );
    }
  } else {
    const { error: insertError } = await supabase.from("votes").insert({
      game_id: game.id,
      voter_id: playerId,
      target_id: targetId,
      vote_type: "pouvoir",
      phase,
    });
    if (insertError) {
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement de l'intuition" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}

// GET - Intuition déjà confiée cette nuit (restauration d'écran)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get("playerId");

  if (!playerId) {
    return NextResponse.json({ error: "playerId requis" }, { status: 400 });
  }

  const supabase = createClient();

  const { data: game } = await supabase
    .from("games")
    .select("id, current_phase")
    .eq("code", code)
    .single();

  if (!game) {
    return NextResponse.json({ error: "Partie non trouvée" }, { status: 404 });
  }

  const { data: vote } = await supabase
    .from("votes")
    .select("target_id")
    .eq("game_id", game.id)
    .eq("voter_id", playerId)
    .eq("vote_type", "pouvoir")
    .eq("phase", game.current_phase ?? 1)
    .maybeSingle();

  return NextResponse.json({ targetId: vote?.target_id ?? null });
}
