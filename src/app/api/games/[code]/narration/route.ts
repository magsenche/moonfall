/**
 * Narration de la phase courante — le texte du rideau de transition.
 * Compose les lignes depuis les derniers game_events (lib/game/narration).
 */

import { createClient } from "@/lib/supabase/client";
import { NextRequest, NextResponse } from "next/server";
import { buildPhaseNarration, type NarrationEventRow } from "@/lib/game/narration";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = createClient();

  const { data: game } = await supabase
    .from("games")
    .select("id, status, current_phase")
    .eq("code", code)
    .single();

  if (!game) {
    return NextResponse.json({ error: "Partie non trouvée" }, { status: 404 });
  }

  const { data: events, error } = await supabase
    .from("game_events")
    .select("event_type, data, created_at")
    .eq("game_id", game.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json(
      { error: "Erreur lors de la lecture des événements" },
      { status: 500 }
    );
  }

  const lines = buildPhaseNarration(
    game.status ?? 'lobby',
    game.current_phase ?? 1,
    (events ?? []).map((e) => ({
      event_type: e.event_type,
      data: (e.data ?? null) as Record<string, unknown> | null,
      created_at: e.created_at ?? "",
    }))
  );

  return NextResponse.json({
    status: game.status,
    phase: game.current_phase ?? 1,
    lines,
  });
}
