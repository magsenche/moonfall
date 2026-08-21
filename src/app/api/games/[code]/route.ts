import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAutoMode } from '@/lib/game/resolution';
import { RESOLUTION_LOCK_STAMP } from '@/lib/game/phaseLock';
import { triggerPhaseTransition } from '@/lib/game/advance';

// Marge avant que le lazy tick reprenne une phase expirée : laisse d'abord
// leur chance aux clients ouverts (auto-résolution échelonnée)
const EXPIRY_GRACE_MS = 3000;

const GAME_SELECT = `
  *,
  players (
    id,
    pseudo,
    is_alive,
    is_mj,
    role_id,
    created_at,
    avatar_url
  )
`;

// GET /api/games/[code] - Get game details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const supabase = await createClient();

    const loadGame = () =>
      supabase.from('games').select(GAME_SELECT).eq('code', code.toUpperCase()).single();

    // Get game with players
    const { data: game, error: gameError } = await loadGame();

    if (gameError || !game) {
      return NextResponse.json(
        { error: 'Partie introuvable' },
        { status: 404 }
      );
    }

    // Lazy tick : les navigateurs mobiles gèlent leurs timers quand l'écran
    // est verrouillé — une phase expirée peut donc attendre longtemps. Toute
    // lecture de l'état la fait avancer côté serveur (Auto-Garou seulement :
    // en mode arbitre, le Maître du jeu garde la main sur le rythme).
    const status = game.status as string;
    const expiredPhase =
      (status === 'nuit' || status === 'jour' || status === 'conseil') &&
      isAutoMode(game.settings) &&
      game.phase_ends_at !== null &&
      game.phase_ends_at !== RESOLUTION_LOCK_STAMP &&
      new Date(game.phase_ends_at).getTime() < Date.now() - EXPIRY_GRACE_MS;

    if (expiredPhase) {
      const advanced = await triggerPhaseTransition(
        request.nextUrl.origin,
        code.toUpperCase(),
        status as 'nuit' | 'jour' | 'conseil'
      );
      if (advanced) {
        const { data: freshGame } = await loadGame();
        if (freshGame) return NextResponse.json(freshGame);
      }
    }

    return NextResponse.json(game);
  } catch (error) {
    console.error('Error fetching game:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}
