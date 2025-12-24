import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const BOT_NAMES = [
  '🤖 Alice',
  '🤖 Bob', 
  '🤖 Charlie',
  '🤖 Diana',
  '🤖 Eve',
  '🤖 Frank',
  '🤖 Grace',
  '🤖 Hugo',
  '🤖 Iris',
  '🤖 Jack',
];

// POST /api/games/[code]/bots - Add bots to fill the game (MJ only, dev mode)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { count = 5, mjPlayerId } = await request.json();

    if (!mjPlayerId) {
      return NextResponse.json(
        { error: 'mjPlayerId requis' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Find the game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, status')
      .eq('code', code.toUpperCase())
      .single();

    if (gameError || !game) {
      return NextResponse.json(
        { error: 'Partie introuvable' },
        { status: 404 }
      );
    }

    // Only in lobby
    if (game.status !== 'lobby') {
      return NextResponse.json(
        { error: 'On ne peut ajouter des bots que dans le lobby' },
        { status: 400 }
      );
    }

    // Verify MJ
    const { data: mjPlayer } = await supabase
      .from('players')
      .select('id, is_mj')
      .eq('id', mjPlayerId)
      .eq('game_id', game.id)
      .single();

    if (!mjPlayer?.is_mj) {
      return NextResponse.json(
        { error: 'Seul le MJ peut ajouter des bots' },
        { status: 403 }
      );
    }

    // Get existing players to avoid duplicate names
    const { data: existingPlayers } = await supabase
      .from('players')
      .select('pseudo')
      .eq('game_id', game.id);

    const existingNames = new Set(existingPlayers?.map(p => p.pseudo) || []);

    // Pick bot names not already used
    const availableNames = BOT_NAMES.filter(name => !existingNames.has(name));
    const botsToCreate = Math.min(count, availableNames.length);

    if (botsToCreate === 0) {
      return NextResponse.json(
        { error: 'Tous les noms de bots sont déjà utilisés' },
        { status: 400 }
      );
    }

    // Create bots
    const bots = availableNames.slice(0, botsToCreate).map(name => ({
      game_id: game.id,
      pseudo: name,
      is_mj: false,
      is_alive: true,
      // No user_id - bots are not real users
    }));

    const { data: createdBots, error: insertError } = await supabase
      .from('players')
      .insert(bots)
      .select('id, pseudo');

    if (insertError) {
      console.error('Error creating bots:', insertError);
      return NextResponse.json(
        { error: 'Erreur lors de la création des bots' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      botsCreated: createdBots?.length || 0,
      bots: createdBots,
    });
  } catch (error) {
    console.error('Error in bots route:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// DELETE /api/games/[code]/bots - Remove all bots (MJ only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { mjPlayerId } = await request.json();

    if (!mjPlayerId) {
      return NextResponse.json(
        { error: 'mjPlayerId requis' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Find the game
    const { data: game } = await supabase
      .from('games')
      .select('id, status')
      .eq('code', code.toUpperCase())
      .single();

    if (!game) {
      return NextResponse.json(
        { error: 'Partie introuvable' },
        { status: 404 }
      );
    }

    // Only in lobby
    if (game.status !== 'lobby') {
      return NextResponse.json(
        { error: 'On ne peut retirer les bots que dans le lobby' },
        { status: 400 }
      );
    }

    // Verify MJ
    const { data: mjPlayer } = await supabase
      .from('players')
      .select('id, is_mj')
      .eq('id', mjPlayerId)
      .eq('game_id', game.id)
      .single();

    if (!mjPlayer?.is_mj) {
      return NextResponse.json(
        { error: 'Seul le MJ peut retirer les bots' },
        { status: 403 }
      );
    }

    // Delete all bots (players with 🤖 in pseudo)
    const { data: deletedBots, error } = await supabase
      .from('players')
      .delete()
      .eq('game_id', game.id)
      .like('pseudo', '🤖%')
      .select('id');

    if (error) {
      console.error('Error deleting bots:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression des bots' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      botsRemoved: deletedBots?.length || 0,
    });
  } catch (error) {
    console.error('Error in bots DELETE route:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
