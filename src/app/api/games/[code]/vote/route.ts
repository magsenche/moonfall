import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type VoteType = Database['public']['Enums']['vote_type'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  
  // Parse request body
  const body = await request.json();
  const { voterId, targetId, voteType = 'jour' } = body as {
    voterId: string;
    targetId: string | null;
    voteType?: VoteType;
  };

  if (!voterId) {
    return NextResponse.json({ error: 'Voter ID requis' }, { status: 400 });
  }

  // Get game and validate
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, status, current_phase, settings')
    .eq('code', code)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: 'Partie non trouvée' }, { status: 404 });
  }

  if (game.status !== 'conseil') {
    return NextResponse.json(
      { error: 'Les votes ne sont possibles que pendant le conseil' },
      { status: 400 }
    );
  }

  // Parse settings for autoMode
  const settings = game.settings as { autoMode?: boolean } | null;
  const isAutoMode = settings?.autoMode ?? false;

  // Validate voter is alive
  const { data: voter, error: voterError } = await supabase
    .from('players')
    .select('id, is_alive, is_mj')
    .eq('id', voterId)
    .eq('game_id', game.id)
    .single();

  if (voterError || !voter) {
    return NextResponse.json({ error: 'Joueur non trouvé' }, { status: 404 });
  }

  // En mode Auto-Garou, le MJ joue aussi et peut voter
  if (voter.is_mj && !isAutoMode) {
    return NextResponse.json({ error: 'Le MJ ne vote pas' }, { status: 403 });
  }

  if (!voter.is_alive) {
    return NextResponse.json({ error: 'Les morts ne votent pas' }, { status: 403 });
  }

  // Validate target exists and is alive (if not null vote)
  if (targetId) {
    const { data: target, error: targetError } = await supabase
      .from('players')
      .select('id, is_alive, is_mj')
      .eq('id', targetId)
      .eq('game_id', game.id)
      .single();

    if (targetError || !target) {
      return NextResponse.json({ error: 'Cible non trouvée' }, { status: 404 });
    }

    if (target.is_mj) {
      return NextResponse.json({ error: 'Impossible de voter contre le MJ' }, { status: 400 });
    }

    if (!target.is_alive) {
      return NextResponse.json({ error: 'Impossible de voter contre un mort' }, { status: 400 });
    }
  }

  // Check if player already voted this phase
  const { data: existingVote } = await supabase
    .from('votes')
    .select('id')
    .eq('game_id', game.id)
    .eq('voter_id', voterId)
    .eq('phase', game.current_phase ?? 1)
    .eq('vote_type', voteType)
    .single();

  if (existingVote) {
    // Update existing vote
    const { error: updateError } = await supabase
      .from('votes')
      .update({ target_id: targetId })
      .eq('id', existingVote.id);

    if (updateError) {
      return NextResponse.json({ error: 'Erreur lors de la mise à jour du vote' }, { status: 500 });
    }
  } else {
    // Insert new vote
    const { error: insertError } = await supabase
      .from('votes')
      .insert({
        game_id: game.id,
        voter_id: voterId,
        target_id: targetId,
        phase: game.current_phase ?? 1,
        vote_type: voteType,
      });

    if (insertError) {
      return NextResponse.json({ error: 'Erreur lors de l\'enregistrement du vote' }, { status: 500 });
    }
  }

  // Check if all alive players have voted
  const { data: alivePlayers } = await supabase
    .from('players')
    .select('id')
    .eq('game_id', game.id)
    .eq('is_alive', true)
    .eq('is_mj', false);

  const { data: votes } = await supabase
    .from('votes')
    .select('id')
    .eq('game_id', game.id)
    .eq('phase', game.current_phase ?? 1)
    .eq('vote_type', voteType);

  const allVoted = alivePlayers && votes && votes.length >= alivePlayers.length;

  return NextResponse.json({
    success: true,
    allVoted,
    votesCount: votes?.length ?? 0,
    totalPlayers: alivePlayers?.length ?? 0,
  });
}

// Get current votes status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, status, current_phase')
    .eq('code', code)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: 'Partie non trouvée' }, { status: 404 });
  }

  // Get alive players count
  const { data: alivePlayers } = await supabase
    .from('players')
    .select('id')
    .eq('game_id', game.id)
    .eq('is_alive', true)
    .eq('is_mj', false);

  // Get current phase votes
  const { data: votes } = await supabase
    .from('votes')
    .select('voter_id, target_id')
    .eq('game_id', game.id)
    .eq('phase', game.current_phase ?? 1)
    .eq('vote_type', 'jour');

  return NextResponse.json({
    phase: game.current_phase ?? 1,
    status: game.status,
    votesCount: votes?.length ?? 0,
    totalPlayers: alivePlayers?.length ?? 0,
    votes: votes ?? [],
  });
}
