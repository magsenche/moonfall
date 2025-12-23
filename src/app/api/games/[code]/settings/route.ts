import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { GameSettings } from '@/types/game';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

// GET - Get game settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const { data: game, error } = await supabase
    .from('games')
    .select('id, settings')
    .eq('code', code.toUpperCase())
    .single();

  if (error || !game) {
    return NextResponse.json({ error: 'Partie non trouvée' }, { status: 404 });
  }

  return NextResponse.json({ settings: game.settings });
}

// PATCH - Update game settings (MJ only, lobby only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { playerId, settings } = body as {
    playerId: string;
    settings: Partial<GameSettings>;
  };

  if (!playerId) {
    return NextResponse.json({ error: 'playerId requis' }, { status: 400 });
  }

  // Get game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, status, settings')
    .eq('code', code.toUpperCase())
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: 'Partie non trouvée' }, { status: 404 });
  }

  // Check game is in lobby
  if (game.status !== 'lobby') {
    return NextResponse.json(
      { error: 'Les paramètres ne peuvent être modifiés que dans le lobby' },
      { status: 400 }
    );
  }

  // Check player is MJ
  const { data: player } = await supabase
    .from('players')
    .select('id, is_mj')
    .eq('id', playerId)
    .eq('game_id', game.id)
    .single();

  if (!player?.is_mj) {
    return NextResponse.json(
      { error: 'Seul le MJ peut modifier les paramètres' },
      { status: 403 }
    );
  }

  // Merge with existing settings
  const currentSettings = (game.settings || {}) as Record<string, unknown>;
  const newSettings = {
    ...currentSettings,
    ...settings,
  };

  // Validate settings
  if (settings.nightDurationMinutes !== undefined) {
    if (settings.nightDurationMinutes < 1 || settings.nightDurationMinutes > 120) {
      return NextResponse.json(
        { error: 'Durée de nuit invalide (1-120 min)' },
        { status: 400 }
      );
    }
  }

  if (settings.voteDurationMinutes !== undefined) {
    if (settings.voteDurationMinutes < 1 || settings.voteDurationMinutes > 60) {
      return NextResponse.json(
        { error: 'Durée de vote invalide (1-60 min)' },
        { status: 400 }
      );
    }
  }

  if (settings.councilIntervalMinutes !== undefined) {
    if (settings.councilIntervalMinutes < 5 || settings.councilIntervalMinutes > 480) {
      return NextResponse.json(
        { error: 'Intervalle de conseil invalide (5-480 min)' },
        { status: 400 }
      );
    }
  }

  // Update settings
  const { error: updateError } = await supabase
    .from('games')
    .update({ settings: newSettings })
    .eq('id', game.id);

  if (updateError) {
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des paramètres' },
      { status: 500 }
    );
  }

  return NextResponse.json({ settings: newSettings });
}
