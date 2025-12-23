import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/games/[code]/join - Join a game
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { pseudo } = await request.json();

    if (!pseudo) {
      return NextResponse.json(
        { error: 'Un pseudo est requis' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Find the game
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .select('id, status')
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (gameError) {
      console.error('Error finding game:', gameError);
      return NextResponse.json(
        { error: 'Erreur lors de la recherche de la partie' },
        { status: 500 }
      );
    }

    if (!gameData) {
      return NextResponse.json(
        { error: 'Partie introuvable. Vérifie le code.' },
        { status: 404 }
      );
    }

    if (gameData.status !== 'lobby') {
      return NextResponse.json(
        { error: 'Cette partie a déjà commencé' },
        { status: 400 }
      );
    }

    // Check if pseudo is already taken in this game
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('id')
      .eq('game_id', gameData.id)
      .eq('pseudo', pseudo)
      .maybeSingle();

    if (existingPlayer) {
      return NextResponse.json(
        { error: 'Ce pseudo est déjà pris dans cette partie' },
        { status: 400 }
      );
    }

    // Add player to the game
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        game_id: gameData.id,
        user_id: user?.id || null,
        pseudo,
        is_mj: false,
        is_alive: true,
      })
      .select()
      .single();

    if (playerError) {
      console.error('Error joining game:', playerError);
      return NextResponse.json(
        { error: 'Erreur lors de la connexion à la partie' },
        { status: 500 }
      );
    }

    // Log the event
    await supabase.from('game_events').insert({
      game_id: gameData.id,
      event_type: 'player_joined',
      actor_id: player.id,
      data: { pseudo },
    });

    return NextResponse.json({
      success: true,
      player: {
        id: player.id,
        pseudo: player.pseudo,
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue' },
      { status: 500 }
    );
  }
}
