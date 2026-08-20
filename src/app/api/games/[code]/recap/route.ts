import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { buildRecap, type RecapEventRow, type RecapIntuition, type RecapPlayer } from '@/lib/game/recap';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

// GET /api/games/[code]/recap - Chronique narrative de fin de partie
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, status, winner')
    .eq('code', code.toUpperCase())
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: 'Partie non trouvée' }, { status: 404 });
  }

  // La chronique révèle les rôles : uniquement en fin de partie
  if (game.status !== 'terminee') {
    return NextResponse.json(
      { error: "Le récap n'est disponible qu'en fin de partie" },
      { status: 400 }
    );
  }

  const { data: playerRows, error: playersError } = await supabase
    .from('players')
    .select('id, pseudo, is_alive, role:roles(name, team)')
    .eq('game_id', game.id);

  if (playersError) {
    return NextResponse.json({ error: 'Erreur lors de la lecture des joueurs' }, { status: 500 });
  }

  const { data: eventRows, error: eventsError } = await supabase
    .from('game_events')
    .select('event_type, actor_id, target_id, data, created_at')
    .eq('game_id', game.id)
    .order('created_at', { ascending: true })
    .limit(500);

  if (eventsError) {
    return NextResponse.json({ error: 'Erreur lors de la lecture des événements' }, { status: 500 });
  }

  // Seuls les joueurs qui ont reçu un rôle participent à la chronique
  // (exclut le MJ arbitre en mode normal)
  const players: RecapPlayer[] = (playerRows ?? [])
    .filter((p) => p.role !== null)
    .map((p) => {
      const role = p.role as { name: string; team: string } | null;
      return {
        id: p.id,
        pseudo: p.pseudo,
        roleName: role?.name ?? null,
        team: role?.team ?? null,
        isAlive: p.is_alive !== false,
      };
    });

  const events: RecapEventRow[] = (eventRows ?? []).map((e) => ({
    event_type: e.event_type,
    actor_id: e.actor_id,
    target_id: e.target_id,
    data: (e.data ?? null) as Record<string, unknown> | null,
  }));

  // Votes 'pouvoir' : phase 0 = procès d'avant-partie (« Délit de faciès »),
  // phases >= 1 = intuitions de nuit (« Flair du village »)
  const { data: pouvoirRows } = await supabase
    .from('votes')
    .select('voter_id, target_id, phase')
    .eq('game_id', game.id)
    .eq('vote_type', 'pouvoir');

  const intuitionRows: RecapIntuition[] = [];
  const procesRows: RecapIntuition[] = [];
  for (const row of pouvoirRows ?? []) {
    const vote = { voter_id: row.voter_id, target_id: row.target_id };
    if ((row.phase ?? 1) === 0) procesRows.push(vote);
    else intuitionRows.push(vote);
  }

  const recap = buildRecap(events, players, intuitionRows, procesRows);

  return NextResponse.json({
    winner: game.winner,
    timeline: recap.timeline,
    titles: recap.titles,
  });
}
