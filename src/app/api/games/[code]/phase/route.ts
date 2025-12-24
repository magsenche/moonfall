import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { PHASE_DURATIONS } from '@/types/game';
import type { GameSettings } from '@/types/game';

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

// Phases that have a timer
const TIMED_PHASES: GameStatus[] = ['jour', 'conseil'];

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

  // Get game with settings
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, status, current_phase, settings')
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

  // Get custom durations from settings or use defaults
  const settings = (game.settings || {}) as Partial<GameSettings>;
  
  // Map phase to settings key (conseil uses voteDurationMinutes)
  const getPhaseDurationSeconds = (p: GameStatus): number => {
    if (p === 'jour') {
      return (settings.councilIntervalMinutes || 5) * 60; // defaults to 5 min
    }
    if (p === 'conseil') {
      return (settings.voteDurationMinutes || 3) * 60; // defaults to 3 min
    }
    // nuit uses nightDurationMinutes
    if (p === 'nuit') {
      return (settings.nightDurationMinutes || 2) * 60; // defaults to 2 min  
    }
    return PHASE_DURATIONS[p as keyof typeof PHASE_DURATIONS] ?? 0;
  };

  // Calculate phase_ends_at if this phase has a timer
  let phaseEndsAt: string | null = null;
  if (TIMED_PHASES.includes(phase)) {
    const durationSeconds = getPhaseDurationSeconds(phase);
    if (durationSeconds) {
      phaseEndsAt = new Date(Date.now() + durationSeconds * 1000).toISOString();
    }
  }

  // Update game phase
  const { error: updateError } = await supabase
    .from('games')
    .update({ 
      status: phase,
      phase_ends_at: phaseEndsAt,
    })
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
      phase_ends_at: phaseEndsAt,
    },
  });

  return NextResponse.json({
    success: true,
    previousPhase: game.status,
    currentPhase: phase,
    phaseEndsAt,
  });
}
