import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/database';
import type { MissionType, MissionCategory, MissionValidationType, RewardType, AuctionData, RewardData } from '@/lib/missions';

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
  const { searchParams } = new URL(request.url);
  const templatesOnly = searchParams.get('templates') === 'true';

  // Get game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id')
    .eq('code', code)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: 'Partie non trouvée' }, { status: 404 });
  }

  // Build query
  let query = supabase
    .from('missions')
    .select(`
      *,
      assigned_player:players!missions_assigned_to_fkey(id, pseudo),
      validator:players!missions_validated_by_fkey(id, pseudo),
      winner:players!missions_winner_player_id_fkey(id, pseudo)
    `)
    .eq('game_id', game.id);

  // Filter templates vs active missions
  if (templatesOnly) {
    query = query.eq('is_template', true);
  } else {
    query = query.or('is_template.is.null,is_template.eq.false');
  }

  const { data: missions, error: missionsError } = await query.order('created_at', { ascending: false });

  if (missionsError) {
    return NextResponse.json({ error: 'Erreur lors de la récupération des missions' }, { status: 500 });
  }

  // Get multi-player assignments with extended info
  const missionIds = missions?.map(m => m.id) || [];
  const assignmentsMap: Record<string, { 
    id: string; 
    pseudo: string; 
    status: string;
    bid?: number;
    score?: number;
    submitted_at?: string;
  }[]> = {};
  
  if (missionIds.length > 0) {
    const { data: assignments } = await supabase
      .from('mission_assignments')
      .select('mission_id, player_id, status, bid, score, submitted_at, player:players(id, pseudo)')
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
            bid: assignment.bid ?? undefined,
            score: assignment.score ?? undefined,
            submitted_at: assignment.submitted_at ?? undefined,
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
    // Basic fields
    title, 
    description, 
    type = 'custom',
    // Player assignment
    assignedTo,
    assignedToMultiple,
    // New advanced fields
    missionType = 'individual' as MissionType,
    category = 'challenge' as MissionCategory,
    validationType = 'mj' as MissionValidationType,
    timeLimitSeconds,
    rewardType = 'none' as RewardType,
    rewardDescription,
    rewardData,
    penaltyDescription,
    externalUrl,
    sabotageAllowed = false,
    // Auction specific
    auctionData,
    // Template handling
    isTemplate = false,
    templateId,
    // Creator
    creatorId,
    deadline,
  } = body as {
    title: string;
    description: string;
    type?: string;
    assignedTo?: string;
    assignedToMultiple?: string[];
    missionType?: MissionType;
    category?: MissionCategory;
    validationType?: MissionValidationType;
    timeLimitSeconds?: number;
    rewardType?: RewardType;
    rewardDescription?: string;
    rewardData?: RewardData;
    penaltyDescription?: string;
    externalUrl?: string;
    sabotageAllowed?: boolean;
    auctionData?: AuctionData;
    isTemplate?: boolean;
    templateId?: string;
    creatorId: string;
    deadline?: string;
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
  // For auction missions, all alive players can participate
  let playerIds: string[] = [];
  
  if (missionType === 'auction') {
    // For auctions, get all alive players (except MJ)
    const { data: alivePlayers } = await supabase
      .from('players')
      .select('id')
      .eq('game_id', game.id)
      .eq('is_alive', true)
      .eq('is_mj', false);
    
    playerIds = alivePlayers?.map(p => p.id) || [];
  } else {
    playerIds = assignedToMultiple?.length ? assignedToMultiple : (assignedTo ? [assignedTo] : []);
  }

  // Verify assigned players exist (if not auction)
  if (missionType !== 'auction' && playerIds.length > 0) {
    const { data: assignees } = await supabase
      .from('players')
      .select('id')
      .in('id', playerIds)
      .eq('game_id', game.id);

    if (!assignees || assignees.length !== playerIds.length) {
      return NextResponse.json({ error: 'Un ou plusieurs joueurs assignés non trouvés' }, { status: 400 });
    }
  }

  // Calculate deadline from time limit if provided
  let calculatedDeadline = deadline ?? null;
  if (timeLimitSeconds && !calculatedDeadline && !isTemplate) {
    const deadlineDate = new Date();
    deadlineDate.setSeconds(deadlineDate.getSeconds() + timeLimitSeconds);
    calculatedDeadline = deadlineDate.toISOString();
  }

  // Create mission with extended fields
  const { data: mission, error: missionError } = await supabase
    .from('missions')
    .insert({
      game_id: game.id,
      title,
      description,
      type, // Legacy type field
      mission_type: missionType,
      category,
      validation_type: validationType,
      time_limit_seconds: timeLimitSeconds ?? null,
      reward_type: rewardType,
      reward_description: rewardDescription ?? null,
      reward_data: (rewardData ?? null) as Json,
      penalty_description: penaltyDescription ?? null,
      external_url: externalUrl ?? null,
      sabotage_allowed: sabotageAllowed,
      auction_data: (auctionData ?? null) as Json,
      is_template: isTemplate,
      template_id: templateId ?? null,
      assigned_to: !isTemplate && playerIds.length === 1 ? playerIds[0] : null,
      deadline: calculatedDeadline,
      status: isTemplate ? 'pending' : (playerIds.length > 0 ? 'in_progress' : 'pending'),
      started_at: !isTemplate && playerIds.length > 0 ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (missionError) {
    console.error('Mission creation error:', missionError);
    return NextResponse.json({ error: 'Erreur lors de la création de la mission' }, { status: 500 });
  }

  // Create assignments in junction table (if not a template)
  if (!isTemplate && playerIds.length > 0) {
    const assignments = playerIds.map(playerId => ({
      mission_id: mission.id,
      player_id: playerId,
      status: missionType === 'auction' ? 'pending' : 'assigned', // Auction starts as pending (bidding phase)
    }));
    
    await supabase.from('mission_assignments').insert(assignments);
  }

  // Log event
  await supabase.from('game_events').insert({
    game_id: game.id,
    actor_id: creatorId,
    target_id: playerIds.length === 1 ? playerIds[0] : null,
    event_type: isTemplate ? 'mission_template_created' : 'mission_created',
    data: {
      mission_id: mission.id,
      title,
      type,
      mission_type: missionType,
      category,
      assigned_player_ids: playerIds,
    },
  });

  return NextResponse.json({ mission }, { status: 201 });
}
