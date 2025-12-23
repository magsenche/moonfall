import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

// GET - List all missions for a game
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  // Get game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id')
    .eq('code', code)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: 'Partie non trouvée' }, { status: 404 });
  }

  // Get missions with assigned player info
  const { data: missions, error: missionsError } = await supabase
    .from('missions')
    .select(`
      *,
      assigned_player:players!missions_assigned_to_fkey(id, pseudo),
      validator:players!missions_validated_by_fkey(id, pseudo)
    `)
    .eq('game_id', game.id)
    .order('created_at', { ascending: false });

  if (missionsError) {
    return NextResponse.json({ error: 'Erreur lors de la récupération des missions' }, { status: 500 });
  }

  return NextResponse.json({ missions });
}

// POST - Create a new mission (MJ only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { 
    title, 
    description, 
    type = 'custom',
    assignedTo,
    deadline,
    rewardDescription,
    penaltyDescription,
    creatorId, // MJ's player ID
  } = body as {
    title: string;
    description: string;
    type?: string;
    assignedTo?: string;
    deadline?: string;
    rewardDescription?: string;
    penaltyDescription?: string;
    creatorId: string;
  };

  if (!title || !description) {
    return NextResponse.json({ error: 'Titre et description requis' }, { status: 400 });
  }

  if (!creatorId) {
    return NextResponse.json({ error: 'ID du créateur requis' }, { status: 400 });
  }

  // Get game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, status')
    .eq('code', code)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: 'Partie non trouvée' }, { status: 404 });
  }

  // Verify creator is MJ
  const { data: creator } = await supabase
    .from('players')
    .select('id, is_mj')
    .eq('id', creatorId)
    .eq('game_id', game.id)
    .single();

  if (!creator?.is_mj) {
    return NextResponse.json({ error: 'Seul le MJ peut créer des missions' }, { status: 403 });
  }

  // If assignedTo is provided, verify the player exists
  if (assignedTo) {
    const { data: assignee } = await supabase
      .from('players')
      .select('id')
      .eq('id', assignedTo)
      .eq('game_id', game.id)
      .single();

    if (!assignee) {
      return NextResponse.json({ error: 'Joueur assigné non trouvé' }, { status: 400 });
    }
  }

  // Create mission
  const { data: mission, error: missionError } = await supabase
    .from('missions')
    .insert({
      game_id: game.id,
      title,
      description,
      type,
      assigned_to: assignedTo ?? null,
      deadline: deadline ?? null,
      reward_description: rewardDescription ?? null,
      penalty_description: penaltyDescription ?? null,
      status: assignedTo ? 'in_progress' : 'pending',
    })
    .select()
    .single();

  if (missionError) {
    return NextResponse.json({ error: 'Erreur lors de la création de la mission' }, { status: 500 });
  }

  // Log event
  await supabase.from('game_events').insert({
    game_id: game.id,
    actor_id: creatorId,
    target_id: assignedTo ?? null,
    event_type: 'mission_created',
    data: {
      mission_id: mission.id,
      title,
      type,
    },
  });

  return NextResponse.json({ mission }, { status: 201 });
}
