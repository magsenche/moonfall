/**
 * « Prêt » collectif — écourter une phase quand tout le monde a fini.
 *
 * Chaque humain vivant peut se déclarer prêt pour la phase en cours
 * (Auto-Garou uniquement). Quand TOUS les humains vivants sont prêts, le
 * dernier prêt déclenche la transition côté serveur (lib/game/advance) —
 * résolution comprise, instantanément. En cas d'échec, filet : le timer est
 * ramené à +3s et l'auto-résolution des clients prend le relais. Le skip
 * n'altère jamais la logique de jeu, il supprime seulement le temps mort.
 *
 * Garde-fous :
 * - la nuit, un loup ne peut être prêt qu'après avoir voté sa victime ;
 * - au conseil, prêt exige d'avoir voté ;
 * - bots et morts sont hors du décompte (le timer reste le filet).
 */

import { createClient } from "@/lib/supabase/client";
import { NextRequest, NextResponse } from "next/server";
import { computeReadiness, isAutoMode, isBotPseudo } from "@/lib/game/resolution";
import { RESOLUTION_LOCK_STAMP } from "@/lib/game/phaseLock";
import { triggerPhaseTransition } from "@/lib/game/advance";

const SKIP_COUNTDOWN_MS = 3000;

type GameStatus = "lobby" | "jour" | "nuit" | "conseil" | "terminee";

async function loadReadiness(
  supabase: ReturnType<typeof createClient>,
  gameId: string,
  phase: number,
  status: GameStatus
) {
  const [{ data: players }, { data: readyRows }] = await Promise.all([
    supabase.from("players").select("id, pseudo, is_alive, is_mj").eq("game_id", gameId),
    supabase
      .from("phase_ready")
      .select("player_id")
      .eq("game_id", gameId)
      .eq("phase", phase)
      .eq("status", status),
  ]);

  return {
    players: players ?? [],
    readyIds: (readyRows ?? []).map((r) => r.player_id),
    readiness: computeReadiness(
      (players ?? []).map((p) => ({
        id: p.id,
        pseudo: p.pseudo,
        isAlive: p.is_alive !== false,
      })),
      (readyRows ?? []).map((r) => r.player_id)
    ),
  };
}

// POST - Se déclarer prêt (ou se rétracter avec ready: false)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { playerId, ready = true } = body as { playerId?: string; ready?: boolean };

  if (!playerId) {
    return NextResponse.json({ error: "playerId requis" }, { status: 400 });
  }

  const supabase = createClient();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, status, current_phase, settings, phase_ends_at")
    .eq("code", code)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: "Partie non trouvée" }, { status: 404 });
  }

  if (!isAutoMode(game.settings)) {
    return NextResponse.json(
      { error: "Le prêt collectif n'existe qu'en Auto-Garou (le MJ gère le rythme sinon)" },
      { status: 400 }
    );
  }

  const status = game.status as GameStatus | null;
  if (status !== "nuit" && status !== "jour" && status !== "conseil") {
    return NextResponse.json(
      { error: "Rien à écourter dans cette phase" },
      { status: 400 }
    );
  }

  const phase = game.current_phase ?? 1;

  // Le joueur : vivant, humain, dans la partie
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, pseudo, is_alive, role:roles(team)")
    .eq("id", playerId)
    .eq("game_id", game.id)
    .single();

  if (playerError || !player) {
    return NextResponse.json({ error: "Joueur non trouvé" }, { status: 404 });
  }

  if (!player.is_alive) {
    return NextResponse.json({ error: "Les morts n'attendent plus rien" }, { status: 400 });
  }

  if (isBotPseudo(player.pseudo)) {
    return NextResponse.json({ error: "Les bots suivent le rythme des humains" }, { status: 400 });
  }

  if (ready) {
    // Préconditions : être prêt n'est pas bâcler ses actions obligatoires
    if (status === "nuit" && (player.role as { team: string } | null)?.team === "loups") {
      const { data: wolfVote } = await supabase
        .from("votes")
        .select("id")
        .eq("game_id", game.id)
        .eq("voter_id", playerId)
        .eq("vote_type", "nuit_loup")
        .eq("phase", phase)
        .maybeSingle();
      if (!wolfVote) {
        return NextResponse.json(
          { error: "Choisis d'abord une victime avec ta meute" },
          { status: 400 }
        );
      }
    }

    if (status === "conseil") {
      const { data: dayVote } = await supabase
        .from("votes")
        .select("id")
        .eq("game_id", game.id)
        .eq("voter_id", playerId)
        .eq("vote_type", "jour")
        .eq("phase", phase)
        .maybeSingle();
      if (!dayVote) {
        return NextResponse.json({ error: "Vote d'abord au conseil" }, { status: 400 });
      }
    }

    const { error: upsertError } = await supabase
      .from("phase_ready")
      .upsert(
        { game_id: game.id, player_id: playerId, phase, status },
        { onConflict: "game_id,player_id,phase,status", ignoreDuplicates: true }
      );
    if (upsertError) {
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement du prêt" },
        { status: 500 }
      );
    }
  } else {
    const { error: deleteError } = await supabase
      .from("phase_ready")
      .delete()
      .eq("game_id", game.id)
      .eq("player_id", playerId)
      .eq("phase", phase)
      .eq("status", status);
    if (deleteError) {
      return NextResponse.json({ error: "Erreur lors de la rétractation" }, { status: 500 });
    }
  }

  const { readiness } = await loadReadiness(supabase, game.id, phase, status);

  // Unanimité → le dernier prêt déclenche la transition LUI-MÊME, côté
  // serveur : personne n'attend qu'un téléphone se réveille. Si la
  // transition échoue, l'ancien filet reprend (timer ramené à +3s, que
  // l'auto-résolution des clients consommera). On ne touche à rien si une
  // résolution est déjà en cours (tampon epoch).
  let skipTriggered = false;
  let advanced = false;
  if (ready && readiness.allReady) {
    const current = game.phase_ends_at;
    const resolutionInProgress = current === RESOLUTION_LOCK_STAMP;

    if (resolutionInProgress) {
      skipTriggered = true;
      advanced = true;
    } else {
      skipTriggered = true;
      await supabase.from("game_events").insert({
        game_id: game.id,
        event_type: "phase_skipped",
        data: { status, phase, ready_count: readiness.readyCount },
      });

      advanced = await triggerPhaseTransition(request.nextUrl.origin, code, status);

      if (!advanced) {
        const soon = new Date(Date.now() + SKIP_COUNTDOWN_MS).toISOString();
        const alreadySooner = current !== null && current <= soon;
        if (!alreadySooner) {
          await supabase
            .from("games")
            .update({ phase_ends_at: soon })
            .eq("id", game.id)
            .eq("status", status);
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    isReady: ready,
    readyCount: readiness.readyCount,
    totalHumans: readiness.totalHumans,
    allReady: readiness.allReady,
    skipTriggered,
    advanced,
  });
}

// GET - Compte des prêts pour la phase en cours
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
    .select("id, status, current_phase")
    .eq("code", code)
    .single();

  if (!game) {
    return NextResponse.json({ error: "Partie non trouvée" }, { status: 404 });
  }

  const status = game.status as GameStatus | null;
  if (status !== "nuit" && status !== "jour" && status !== "conseil") {
    return NextResponse.json({ readyCount: 0, totalHumans: 0, isReady: false });
  }

  const phase = game.current_phase ?? 1;
  const { readiness, readyIds } = await loadReadiness(supabase, game.id, phase, status);

  return NextResponse.json({
    readyCount: readiness.readyCount,
    totalHumans: readiness.totalHumans,
    isReady: playerId ? readyIds.includes(playerId) : false,
  });
}
