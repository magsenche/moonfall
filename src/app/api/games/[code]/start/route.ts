import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { shuffle } from '@/lib/utils/game';

// POST /api/games/[code]/start - Start the game and distribute roles
export async function POST(
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
          is_mj,
          role_id
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

    // Check if game is in lobby state
    if (game.status !== 'lobby') {
      return NextResponse.json(
        { error: 'La partie a déjà commencé' },
        { status: 400 }
      );
    }

    // Get non-MJ players
    const players = game.players.filter((p) => !p.is_mj);
    
    if (players.length < 3) {
      return NextResponse.json(
        { error: 'Il faut au moins 3 joueurs pour commencer' },
        { status: 400 }
      );
    }

    // Get active roles from database
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('id, name, team')
      .eq('is_active', true);

    if (rolesError || !roles) {
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des rôles' },
        { status: 500 }
      );
    }

    // Create role map for easy lookup
    const roleMap = new Map(roles.map((r) => [r.name, r.id]));
    
    const villageoisId = roleMap.get('villageois');
    const loupGarouId = roleMap.get('loup_garou');
    const voyanteId = roleMap.get('voyante');

    if (!villageoisId || !loupGarouId || !voyanteId) {
      return NextResponse.json(
        { error: 'Rôles de base manquants en base de données' },
        { status: 500 }
      );
    }

    // Calculate role distribution based on player count
    // Rule: ~1/3 loups, 1 voyante, rest villageois
    const playerCount = players.length;
    const wolfCount = Math.max(1, Math.floor(playerCount / 3));
    
    // Build roles array
    const rolesArray: string[] = [];
    
    // Add wolves
    for (let i = 0; i < wolfCount; i++) {
      rolesArray.push(loupGarouId);
    }
    
    // Add voyante (if more than 3 players)
    if (playerCount > 3) {
      rolesArray.push(voyanteId);
    }
    
    // Fill rest with villageois
    while (rolesArray.length < playerCount) {
      rolesArray.push(villageoisId);
    }

    // Shuffle and assign
    const shuffledRoles = shuffle(rolesArray);
    
    // Update each player with their role
    const updatePromises = players.map((player, index) => 
      supabase
        .from('players')
        .update({ role_id: shuffledRoles[index] })
        .eq('id', player.id)
    );

    const results = await Promise.all(updatePromises);
    
    // Check for errors
    const updateErrors = results.filter((r) => r.error);
    if (updateErrors.length > 0) {
      console.error('Errors updating players:', updateErrors);
      return NextResponse.json(
        { error: 'Erreur lors de la distribution des rôles' },
        { status: 500 }
      );
    }

    // Update game status to 'nuit' (first night)
    const { error: updateError } = await supabase
      .from('games')
      .update({ 
        status: 'nuit',
        current_phase: 1,
        started_at: new Date().toISOString()
      })
      .eq('id', game.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Erreur lors du démarrage de la partie' },
        { status: 500 }
      );
    }

    // Log game event
    await supabase.from('game_events').insert({
      game_id: game.id,
      event_type: 'game_started',
      data: { 
        player_count: playerCount,
        wolf_count: wolfCount,
        has_voyante: playerCount > 3
      }
    });

    return NextResponse.json({ 
      success: true,
      message: 'La partie a commencé !',
      playerCount,
      wolfCount
    });
  } catch (error) {
    console.error('Error starting game:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}
