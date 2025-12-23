import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type MissionStatus = Database['public']['Enums']['mission_status'];

// GET - Get a specific mission
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; missionId: string }> }
) {
  const { code, missionId } = await params;

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
  const { data: mission, error } = await supabase
    .from('missions')
    .select(`
      *,
      assigned_player:players!missions_assigned_to_fkey(id, pseudo),
      validator:players!missions_validated_by_fkey(id, pseudo)
    `)
    .eq('id', missionId)
    .eq('game_id', game.id)
    .single();

  if (error || !mission) {
    return NextResponse.json({ error: 'Mission non trouvée' }, { status: 404 });
  }

  return NextResponse.json({ mission });
}

// PATCH - Update mission (assign, change status, validate)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; missionId: string }> }
) {
  const { code, missionId } = await params;
  const body = await request.json();
  const { 
    playerId,
    action,
    assignTo,
  } = body as {
    playerId: string;
    action: 'assign' | 'validate' | 'fail' | 'cancel';
    assignTo?: string;
  };

  if (!playerId || !action) {
    return NextResponse.json({ error: 'playerId et action requis' }, { status: 400 });
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

  // Get player making the request
  const { data: player } = await supabase
    .from('players')
    .select('id, is_mj')
    .eq('id', playerId)
    .eq('game_id', game.id)
    .single();

  if (!player) {
    return NextResponse.json({ error: 'Joueur non trouvé' }, { status: 404 });
  }

  // Only MJ can validate, fail, or cancel missions
  if (['validate', 'fail', 'cancel'].includes(action) && !player.is_mj) {
    return NextResponse.json({ error: 'Seul le MJ peut effectuer cette action' }, { status: 403 });
  }

  let updateData: Partial<Database['public']['Tables']['missions']['Update']> = {};
  let newStatus: MissionStatus | undefined;

  switch (action) {
    case 'assign':
      if (!player.is_mj) {
        return NextResponse.json({ error: 'Seul le MJ peut assigner des missions' }, { status: 403 });
      }
      if (!assignTo) {
        return NextResponse.json({ error: 'assignTo requis pour assigner' }, { status: 400 });
      }
      // Verify assignee exists
      const { data: assignee } = await supabase
        .from('players')
        .select('id')
        .eq('id', assignTo)
        .eq('game_id', game.id)
        .single();
      if (!assignee) {
        return NextResponse.json({ error: 'Joueur à assigner non trouvé' }, { status: 400 });
      }
      updateData = {
        assigned_to: assignTo,
        status: 'in_progress',
      };
      newStatus = 'in_progress';
      break;

    case 'validate':
      if (mission.status !== 'in_progress') {
        return NextResponse.json({ error: 'Mission pas en cours' }, { status: 400 });
      }
      updateData = {
        status: 'success',
        validated_by: playerId,
        validated_at: new Date().toISOString(),
      };
      newStatus = 'success';
      break;

    case 'fail':
      if (mission.status !== 'in_progress') {
        return NextResponse.json({ error: 'Mission pas en cours' }, { status: 400 });
      }
      updateData = {
        status: 'failed',
        validated_by: playerId,
        validated_at: new Date().toISOString(),
      };
      newStatus = 'failed';
      break;

    case 'cancel':
      updateData = {
        status: 'cancelled',
      };
      newStatus = 'cancelled';
      break;

    default:
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
  }

  // Update mission
  const { data: updatedMission, error: updateError } = await supabase
    .from('missions')
    .update(updateData)
    .eq('id', missionId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
  }

  // Log event
  await supabase.from('game_events').insert({
    game_id: game.id,
    actor_id: playerId,
    target_id: mission.assigned_to,
    event_type: `mission_${action}`,
    data: {
      mission_id: missionId,
      title: mission.title,
      previous_status: mission.status,
      new_status: newStatus,
    },
  });

  return NextResponse.json({ mission: updatedMission });
}

// DELETE - Delete a mission (MJ only)
export async function DELETE(
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

  // Verify player is MJ
  const { data: player } = await supabase
    .from('players')
    .select('id, is_mj')
    .eq('id', playerId)
    .eq('game_id', game.id)
    .single();

  if (!player?.is_mj) {
    return NextResponse.json({ error: 'Seul le MJ peut supprimer des missions' }, { status: 403 });
  }

  // Delete mission
  const { error: deleteError } = await supabase
    .from('missions')
    .delete()
    .eq('id', missionId)
    .eq('game_id', game.id);

  if (deleteError) {
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
