import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/games/[code] - Get game details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const supabase = await createClient();

    // Get game with players
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select(`
        *,
        players (
          id,
          pseudo,
          is_alive,
          is_mj,
          role_id,
          created_at
        )
      `)
      .eq('code', code.toUpperCase())
      .single();

    if (gameError || !game) {
      return NextResponse.json(
        { error: 'Partie introuvable' },
        { status: 404 }
      );
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
