import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateGameCode } from '@/lib/utils';
import { rateLimit, getClientIp, RATE_LIMITS } from '@/lib/utils/rate-limit';
import { DEFAULT_GAME_SETTINGS } from '@/types/game';
import type { Json } from '@/types/database';

// POST /api/games - Create a new game
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rateLimitResult = rateLimit(`create-game:${ip}`, RATE_LIMITS.createGame);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessaie dans quelques instants.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
          }
        }
      );
    }

    const { name, pseudo } = await request.json();

    if (!name || !pseudo) {
      return NextResponse.json(
        { error: 'Le nom de la partie et ton pseudo sont requis' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get the current user (if authenticated)
    const { data: { user } } = await supabase.auth.getUser();

    // Generate a unique game code
    let code = generateGameCode();
    let attempts = 0;
    const maxAttempts = 10;

    // Make sure the code is unique
    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from('games')
        .select('id')
        .eq('code', code)
        .single();

      if (!existing) break;
      
      code = generateGameCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: 'Impossible de générer un code unique' },
        { status: 500 }
      );
    }

    // Create the game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        code,
        name,
        status: 'lobby',
        settings: DEFAULT_GAME_SETTINGS as unknown as Json,
      })
      .select()
      .single();

    if (gameError) {
      console.error('Error creating game:', gameError);
      return NextResponse.json(
        { error: 'Erreur lors de la création de la partie' },
        { status: 500 }
      );
    }

    // Add the creator as MJ
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        game_id: game.id,
        user_id: user?.id || null,
        pseudo,
        is_mj: true,
        is_alive: true,
      })
      .select()
      .single();

    if (playerError || !player) {
      console.error('Error adding MJ:', playerError);
      // Clean up the game if player creation failed
      await supabase.from('games').delete().eq('id', game.id);
      return NextResponse.json(
        { error: 'Erreur lors de l\'ajout du MJ' },
        { status: 500 }
      );
    }

    // Log the event
    await supabase.from('game_events').insert({
      game_id: game.id,
      event_type: 'game_created',
      data: { name, created_by: pseudo },
    });

    return NextResponse.json({
      id: game.id,
      code: game.code,
      name: game.name,
      playerId: player.id,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue' },
      { status: 500 }
    );
  }
}

// GET /api/games - List games (optional, for debugging)
export async function GET() {
  const supabase = await createClient();
  
  const { data: games, error } = await supabase
    .from('games')
    .select('id, code, name, status, created_at')
    .eq('status', 'lobby')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(games);
}
