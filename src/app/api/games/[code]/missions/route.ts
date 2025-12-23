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

  // Get missions with assigned player info (legacy single player)
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

  // Get multi-player assignments
  const missionIds = missions?.map(m => m.id) || [];
  const assignmentsMap: Record<string, { id: string; pseudo: string; status: string }[]> = {};
  
  if (missionIds.length > 0) {
    const { data: assignments } = await supabase
      .from('mission_assignments')
      .select('mission_id, player_id, status, player:players(id, pseudo)')
      .in('mission_id', missionIds);
    
    if (assignments) {
      for (const assignment of assignments) {
        if (!assignmentsMap[assignment.mission_id]) {
          assignmentsMap[assignment.mission_id] = [];
        }
        const player = assignment.player as unknown as { id: string; pseudo: string } | null;
        if (player) {
          assignmentsMap[assignment.mission_id].push({
            id: player.id,
            pseudo: player.pseudo,
            status: assignment.status || 'assigned',
          });
        }
      }
    }
  }

  // Merge assignments into missions
  const missionsWithAssignments = missions?.map(mission => ({
    ...mission,
    assigned_players: assignmentsMap[mission.id] || [],
  })) || [];

  return NextResponse.json({ missions: missionsWithAssignments });
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
    assignedToMultiple, // NEW: array of player IDs for multi-player missions
    deadline,
    rewardDescription,
    penaltyDescription,
    creatorId, // MJ's player ID
  } = body as {
    title: string;
    description: string;
    type?: string;
    assignedTo?: string;
    assignedToMultiple?: string[];
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

  // Determine assigned players (multi or single)
  const playerIds = assignedToMultiple?.length ? assignedToMultiple : (assignedTo ? [assignedTo] : []);
  
  // Verify all assigned players exist
  if (playerIds.length > 0) {
    const { data: assignees } = await supabase
      .from('players')
      .select('id')
      .in('id', playerIds)
      .eq('game_id', game.id);

    if (!assignees || assignees.length !== playerIds.length) {
      return NextResponse.json({ error: 'Un ou plusieurs joueurs assignés non trouvés' }, { status: 400 });
    }
  }

  // Create mission (keep assigned_to for backward compatibility with single player)
  const { data: mission, error: missionError } = await supabase
    .from('missions')
    .insert({
      game_id: game.id,
      title,
      description,
      type,
      assigned_to: playerIds.length === 1 ? playerIds[0] : null, // Legacy single-player field
      deadline: deadline ?? null,
      reward_description: rewardDescription ?? null,
      penalty_description: penaltyDescription ?? null,
      status: playerIds.length > 0 ? 'in_progress' : 'pending',
    })
    .select()
    .single();

  if (missionError) {
    return NextResponse.json({ error: 'Erreur lors de la création de la mission' }, { status: 500 });
  }

  // Create assignments in junction table for multi-player support
  if (playerIds.length > 0) {
    const assignments = playerIds.map(playerId => ({
      mission_id: mission.id,
      player_id: playerId,
      status: 'assigned',
    }));
    
    await supabase.from('mission_assignments').insert(assignments);
  }

  // Log event
  await supabase.from('game_events').insert({
    game_id: game.id,
    actor_id: creatorId,
    target_id: playerIds.length === 1 ? playerIds[0] : null,
    event_type: 'mission_created',
    data: {
      mission_id: mission.id,
      title,
      type,
      assigned_player_ids: playerIds,
    },
  });

  return NextResponse.json({ mission }, { status: 201 });
}
