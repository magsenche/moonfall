/**
 * Récap du dernier conseil — qui a voté contre qui.
 *
 * Le détail des votes ne parvenait qu'au client qui déclenche la résolution
 * (et disparaissait au changement de phase) : personne ne le voyait en vraie
 * partie. La résolution persiste maintenant un événement `council_results`
 * (votes anonymes masqués avant écriture) ; cette route le sert à tous.
 */

import { createClient } from "@/lib/supabase/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = createClient();

  const { data: game } = await supabase
    .from("games")
    .select("id")
    .eq("code", code)
    .single();

  if (!game) {
    return NextResponse.json({ error: "Partie non trouvée" }, { status: 404 });
  }

  const { data: events, error } = await supabase
    .from("game_events")
    .select("data, created_at")
    .eq("game_id", game.id)
    .eq("event_type", "council_results")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    return NextResponse.json(
      { error: "Erreur lors de la lecture du conseil" },
      { status: 500 }
    );
  }

  return NextResponse.json({ council: events?.[0]?.data ?? null });
}
