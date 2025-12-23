import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type GameStatus = Database['public']['Enums']['game_status'];

const VALID_TRANSITIONS: Record<GameStatus, GameStatus[]> = {
  lobby: ['nuit'],
  nuit: ['jour'],
  jour: ['conseil'],
  conseil: ['nuit', 'terminee'],
  terminee: [],
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { phase } = body as { phase: GameStatus };

  if (!phase) {
    return NextResponse.json({ error: 'Phase requise' }, { status: 400 });
  }

  // Get game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, status, current_phase')
    .eq('code', code)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: 'Partie non trouvée' }, { status: 404 });
  }

  // Validate transition
  const validNextPhases = VALID_TRANSITIONS[game.status as GameStatus] ?? [];
  if (!validNextPhases.includes(phase)) {
    return NextResponse.json(
      { error: `Transition invalide: ${game.status} → ${phase}` },
      { status: 400 }
    );
  }

  // Update game phase
  const { error: updateError } = await supabase
    .from('games')
    .update({ status: phase })
    .eq('id', game.id);

  if (updateError) {
    return NextResponse.json({ error: 'Erreur lors du changement de phase' }, { status: 500 });
  }

  // Log event
  await supabase.from('game_events').insert({
    game_id: game.id,
    event_type: 'phase_changed',
    data: {
      from: game.status,
      to: phase,
      phase: game.current_phase,
    },
  });

  return NextResponse.json({
    success: true,
    previousPhase: game.status,
    currentPhase: phase,
  });
}
