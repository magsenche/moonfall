import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/games/[code]/join - Join a game or rejoin by pseudo
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { pseudo, rejoin } = await request.json();

    if (!pseudo) {
      return NextResponse.json(
        { error: 'Un pseudo est requis' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Find the game (allow joining games in any status for rejoin)
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

    // Check if pseudo exists in this game
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('id, pseudo, is_mj, is_alive, role_id')
      .eq('game_id', gameData.id)
      .ilike('pseudo', pseudo.trim())
      .maybeSingle();

    // REJOIN: If player exists and rejoin is requested
    if (existingPlayer && rejoin) {
      // Link user_id if authenticated and not already linked
      if (user && !existingPlayer.role_id) {
        await supabase
          .from('players')
          .update({ user_id: user.id })
          .eq('id', existingPlayer.id);
      }

      // Log the rejoin
      await supabase.from('game_events').insert({
        game_id: gameData.id,
        event_type: 'player_rejoined',
        actor_id: existingPlayer.id,
        data: { pseudo: existingPlayer.pseudo },
      });

      return NextResponse.json({
        success: true,
        rejoined: true,
        player: {
          id: existingPlayer.id,
          pseudo: existingPlayer.pseudo,
          is_mj: existingPlayer.is_mj,
        },
      });
    }

    // If player exists but no rejoin flag - check game status
    if (existingPlayer) {
      // If game is still in lobby, this is an error
      if (gameData.status === 'lobby') {
        return NextResponse.json(
          { error: 'Ce pseudo est déjà pris dans cette partie' },
          { status: 400 }
        );
      }
      // Game in progress - suggest rejoin
      return NextResponse.json({
        error: 'Ce pseudo existe dans cette partie. Veux-tu te reconnecter ?',
        canRejoin: true,
        pseudo: existingPlayer.pseudo,
      }, { status: 409 });
    }

    // NEW JOIN: Only allowed in lobby
    if (gameData.status !== 'lobby') {
      return NextResponse.json(
        { error: 'Cette partie a déjà commencé. Tu ne peux pas rejoindre.' },
        { status: 400 }
      );
    }

    // Add player to the game
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        game_id: gameData.id,
        user_id: user?.id || null,
        pseudo: pseudo.trim(),
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
