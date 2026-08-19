import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/database';
import type { SubmissionData } from '@/lib/missions';
import { awardMissionPoints } from '@/lib/game/missionPoints';
import { basePointsForDifficulty } from '@/lib/game/resolution';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

// POST - Player submits their mission result
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; missionId: string }> }
) {
  const { code, missionId } = await params;
  const body = await request.json();
  const { 
    playerId,
    submissionData,
    score,
  } = body as {
    playerId: string;
    submissionData?: SubmissionData;
    score?: number;
  };

  if (!playerId) {
    return NextResponse.json({ error: 'playerId requis' }, { status: 400 });
  }

  // Get game
  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('code', code)
    .single();

  if (!game) {
    return NextResponse.json({ error: 'Partie non trouvée' }, { status: 404 });
  }

  // Get mission
  const { data: mission } = await supabase
    .from('missions')
    .select('*')
    .eq('id', missionId)
    .eq('game_id', game.id)
    .single();

  if (!mission) {
    return NextResponse.json({ error: 'Mission non trouvée' }, { status: 404 });
  }

  // Check mission is in progress
  if (mission.status !== 'in_progress') {
    return NextResponse.json({ error: 'Mission non active' }, { status: 400 });
  }

  // Get player's assignment
  const { data: assignment } = await supabase
    .from('mission_assignments')
    .select('*')
    .eq('mission_id', missionId)
    .eq('player_id', playerId)
    .single();

  if (!assignment) {
    return NextResponse.json({ error: 'Vous n\'êtes pas assigné à cette mission' }, { status: 403 });
  }

  // Check if already submitted
  if (assignment.submitted_at) {
    return NextResponse.json({ error: 'Vous avez déjà soumis pour cette mission' }, { status: 400 });
  }

  // Update assignment with submission
  const { data: updatedAssignment, error: updateError } = await supabase
    .from('mission_assignments')
    .update({
      status: 'completed',
      submission_data: (submissionData ?? null) as Json,
      score: score ?? null,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', assignment.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: 'Erreur lors de la soumission' }, { status: 500 });
  }

  // Handle auto-validation types
  if (mission.validation_type === 'self') {
    // Self-validation: auto-success and award points immediately
    await supabase
      .from('missions')
      .update({
        status: 'success',
        winner_player_id: playerId,
        completed_at: new Date().toISOString(),
      })
      .eq('id', missionId);

    // Award points to player (the SQL function applies the role multiplier)
    let pointsAwarded = 0;
    if (mission.reward_points && mission.reward_points > 0) {
      pointsAwarded = await awardMissionPoints(supabase, {
        gameId: game.id,
        playerId,
        basePoints: mission.reward_points,
        reason: 'mission_self_validation',
        eventData: { mission_id: missionId, mission_title: mission.title },
      });
    }

    await supabase.from('game_events').insert({
      game_id: game.id,
      actor_id: playerId,
      event_type: 'mission_won',
      data: {
        mission_id: missionId,
        title: mission.title,
        validation_type: 'self',
        points_awarded: pointsAwarded,
        base_points: mission.reward_points,
      },
    });

    return NextResponse.json({ 
      assignment: updatedAssignment,
      isWinner: true,
      pointsAwarded: pointsAwarded,
      message: pointsAwarded > (mission.reward_points ?? 0)
        ? `Mission réussie ! +${pointsAwarded} points (x1.5 Villageois) 🎉`
        : `Mission réussie ! +${pointsAwarded} points 🎉`,
    });
  }

  if (mission.validation_type === 'first_wins') {
    // First submission wins - mark mission as success
    await supabase
      .from('missions')
      .update({
        status: 'success',
        winner_player_id: playerId,
        completed_at: new Date().toISOString(),
      })
      .eq('id', missionId);

    // Le vainqueur touche les points de la mission (difficulté 1-5 = 2-10 pts)
    const pointsAwarded = await awardMissionPoints(supabase, {
      gameId: game.id,
      playerId,
      basePoints: basePointsForDifficulty(mission.difficulty),
      reason: 'mission_complete',
      eventData: { mission_id: missionId, mission_title: mission.title, difficulty: mission.difficulty },
    });

    await supabase.from('game_events').insert({
      game_id: game.id,
      actor_id: playerId,
      event_type: 'mission_won',
      data: {
        mission_id: missionId,
        title: mission.title,
        validation_type: 'first_wins',
        points_awarded: pointsAwarded,
      },
    });

    return NextResponse.json({
      assignment: updatedAssignment,
      isWinner: true,
      pointsAwarded,
      message: `Félicitations ! Vous avez gagné la mission ! +${pointsAwarded} points`,
    });
  }

  if (mission.validation_type === 'best_score') {
    // Check if all players have submitted
    const { data: allAssignments } = await supabase
      .from('mission_assignments')
      .select('id, submitted_at, score, player_id')
      .eq('mission_id', missionId);

    const allSubmitted = allAssignments?.every(a => a.submitted_at);
    
    if (allSubmitted && allAssignments) {
      // Find winner (highest score)
      const winner = allAssignments.reduce((prev, curr) => 
        (curr.score ?? 0) > (prev.score ?? 0) ? curr : prev
      );

      await supabase
        .from('missions')
        .update({
          status: 'success',
          winner_player_id: winner.player_id,
          completed_at: new Date().toISOString(),
        })
        .eq('id', missionId);

      // Le vainqueur touche les points de la mission (difficulté 1-5 = 2-10 pts)
      const pointsAwarded = await awardMissionPoints(supabase, {
        gameId: game.id,
        playerId: winner.player_id,
        basePoints: basePointsForDifficulty(mission.difficulty),
        reason: 'mission_complete',
        eventData: { mission_id: missionId, mission_title: mission.title, difficulty: mission.difficulty },
      });

      await supabase.from('game_events').insert({
        game_id: game.id,
        actor_id: winner.player_id,
        event_type: 'mission_won',
        data: {
          mission_id: missionId,
          title: mission.title,
          validation_type: 'best_score',
          winning_score: winner.score,
          points_awarded: pointsAwarded,
        },
      });
    }
  }

  // Log submission event
  await supabase.from('game_events').insert({
    game_id: game.id,
    actor_id: playerId,
    event_type: 'mission_submitted',
    data: {
      mission_id: missionId,
      title: mission.title,
      score,
    },
  });

  return NextResponse.json({ 
    assignment: updatedAssignment,
    message: 'Soumission enregistrée',
  });
}

// GET - Get player's submission status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; missionId: string }> }
) {
  const { code, missionId } = await params;
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');

  if (!playerId) {
    return NextResponse.json({ error: 'playerId requis' }, { status: 400 });
  }

  // Get game
  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('code', code)
    .single();

  if (!game) {
    return NextResponse.json({ error: 'Partie non trouvée' }, { status: 404 });
  }

  // Get assignment
  const { data: assignment } = await supabase
    .from('mission_assignments')
    .select('*')
    .eq('mission_id', missionId)
    .eq('player_id', playerId)
    .single();

  if (!assignment) {
    return NextResponse.json({ error: 'Non assigné' }, { status: 404 });
  }

  return NextResponse.json({ assignment });
}
