import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { AuctionData } from '@/lib/missions';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

// POST - Player places a bid on an auction mission
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; missionId: string }> }
) {
  const { code, missionId } = await params;
  const body = await request.json();
  const { playerId, bid } = body as { playerId: string; bid: number };

  if (!playerId) {
    return NextResponse.json({ error: 'playerId requis' }, { status: 400 });
  }

  if (typeof bid !== 'number' || bid < 1) {
    return NextResponse.json({ error: 'Enchère invalide (doit être >= 1)' }, { status: 400 });
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

  // Verify it's an auction mission
  if (mission.mission_type !== 'auction') {
    return NextResponse.json({ error: 'Cette mission n\'est pas une enchère' }, { status: 400 });
  }

  // Check mission status (should be in_progress during bidding)
  if (mission.status !== 'in_progress') {
    return NextResponse.json({ error: 'Les enchères sont fermées' }, { status: 400 });
  }

  // Get player's assignment
  const { data: assignment } = await supabase
    .from('mission_assignments')
    .select('*')
    .eq('mission_id', missionId)
    .eq('player_id', playerId)
    .single();

  if (!assignment) {
    return NextResponse.json({ error: 'Vous ne participez pas à cette enchère' }, { status: 403 });
  }

  // Get current auction data
  const auctionData = mission.auction_data as AuctionData | null;
  const minBid = auctionData?.min_bid ?? 1;
  const maxBid = auctionData?.max_bid;
  const currentHighest = auctionData?.current_highest_bid ?? 0;

  // Validate bid
  if (bid < minBid) {
    return NextResponse.json({ error: `Enchère minimum: ${minBid}` }, { status: 400 });
  }

  if (maxBid && bid > maxBid) {
    return NextResponse.json({ error: `Enchère maximum: ${maxBid}` }, { status: 400 });
  }

  if (bid <= currentHighest) {
    return NextResponse.json({ 
      error: `Vous devez enchérir plus que ${currentHighest}`,
      currentHighest,
    }, { status: 400 });
  }

  // Update player's assignment with bid
  const { error: assignmentError } = await supabase
    .from('mission_assignments')
    .update({ bid })
    .eq('id', assignment.id);

  if (assignmentError) {
    return NextResponse.json({ error: 'Erreur lors de l\'enchère' }, { status: 500 });
  }

  // Update mission's auction data with new highest
  const updatedAuctionData: AuctionData = {
    ...auctionData,
    current_highest_bid: bid,
    current_highest_bidder: playerId,
  };

  await supabase
    .from('missions')
    .update({ auction_data: updatedAuctionData as unknown as Database['public']['Tables']['missions']['Update']['auction_data'] })
    .eq('id', missionId);

  // Log event
  await supabase.from('game_events').insert({
    game_id: game.id,
    actor_id: playerId,
    event_type: 'mission_bid',
    data: {
      mission_id: missionId,
      title: mission.title,
      bid,
      previous_highest: currentHighest,
    },
  });

  return NextResponse.json({ 
    success: true,
    bid,
    message: `Enchère de ${bid} enregistrée !`,
  });
}

// PATCH - MJ closes bidding and starts execution phase
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; missionId: string }> }
) {
  const { code, missionId } = await params;
  const body = await request.json();
  const { playerId, action } = body as { 
    playerId: string; 
    action: 'close_bidding' | 'declare_winner' | 'declare_failure';
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

  // Verify MJ
  const { data: player } = await supabase
    .from('players')
    .select('id, is_mj')
    .eq('id', playerId)
    .eq('game_id', game.id)
    .single();

  if (!player?.is_mj) {
    return NextResponse.json({ error: 'Seul le MJ peut gérer l\'enchère' }, { status: 403 });
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

  if (mission.mission_type !== 'auction') {
    return NextResponse.json({ error: 'Cette mission n\'est pas une enchère' }, { status: 400 });
  }

  const auctionData = mission.auction_data as AuctionData | null;

  if (action === 'close_bidding') {
    // Close bidding - the highest bidder must now perform
    if (!auctionData?.current_highest_bidder) {
      return NextResponse.json({ error: 'Aucune enchère n\'a été placée' }, { status: 400 });
    }

    // Get highest bidder info
    const { data: highestBidder } = await supabase
      .from('players')
      .select('id, pseudo')
      .eq('id', auctionData.current_highest_bidder)
      .single();

    // Update auction data with execution phase
    const updatedAuctionData: AuctionData = {
      ...auctionData,
      bid_phase_ends_at: new Date().toISOString(),
    };

    await supabase
      .from('missions')
      .update({ auction_data: updatedAuctionData as unknown as Database['public']['Tables']['missions']['Update']['auction_data'] })
      .eq('id', missionId);

    await supabase.from('game_events').insert({
      game_id: game.id,
      actor_id: playerId,
      event_type: 'auction_bidding_closed',
      data: {
        mission_id: missionId,
        title: mission.title,
        winner_id: auctionData.current_highest_bidder,
        winning_bid: auctionData.current_highest_bid,
      },
    });

    return NextResponse.json({ 
      success: true,
      highestBidder,
      bid: auctionData.current_highest_bid,
      message: `${highestBidder?.pseudo} doit maintenant réaliser ${auctionData.current_highest_bid} !`,
    });
  }

  if (action === 'declare_winner') {
    // Winner accomplished their bid
    const winnerId = auctionData?.current_highest_bidder;
    if (!winnerId) {
      return NextResponse.json({ error: 'Pas de gagnant d\'enchère' }, { status: 400 });
    }

    await supabase
      .from('missions')
      .update({
        status: 'success',
        winner_player_id: winnerId,
        completed_at: new Date().toISOString(),
      })
      .eq('id', missionId);

    // Update winner's assignment
    await supabase
      .from('mission_assignments')
      .update({
        status: 'completed',
        score: auctionData?.current_highest_bid ?? 0,
        submitted_at: new Date().toISOString(),
        validated_by_mj: true,
      })
      .eq('mission_id', missionId)
      .eq('player_id', winnerId);

    await supabase.from('game_events').insert({
      game_id: game.id,
      actor_id: winnerId,
      event_type: 'mission_won',
      data: {
        mission_id: missionId,
        title: mission.title,
        validation_type: 'auction',
        winning_bid: auctionData?.current_highest_bid,
      },
    });

    return NextResponse.json({ 
      success: true,
      message: 'Mission réussie ! Le gagnant reçoit sa récompense.',
    });
  }

  if (action === 'declare_failure') {
    // Winner failed to accomplish their bid
    const loserId = auctionData?.current_highest_bidder;

    await supabase
      .from('missions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', missionId);

    if (loserId) {
      await supabase
        .from('mission_assignments')
        .update({
          status: 'failed',
          validated_by_mj: true,
        })
        .eq('mission_id', missionId)
        .eq('player_id', loserId);
    }

    await supabase.from('game_events').insert({
      game_id: game.id,
      actor_id: playerId,
      target_id: loserId,
      event_type: 'mission_failed',
      data: {
        mission_id: missionId,
        title: mission.title,
        failed_bid: auctionData?.current_highest_bid,
      },
    });

    return NextResponse.json({ 
      success: true,
      message: 'Mission échouée. La pénalité s\'applique.',
    });
  }

  return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
}

// GET - Get current auction status
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

  // Get mission with auction data
  const { data: mission } = await supabase
    .from('missions')
    .select('id, title, mission_type, status, auction_data')
    .eq('id', missionId)
    .eq('game_id', game.id)
    .single();

  if (!mission) {
    return NextResponse.json({ error: 'Mission non trouvée' }, { status: 404 });
  }

  // Get all bids
  const { data: assignments } = await supabase
    .from('mission_assignments')
    .select('player_id, bid, player:players(id, pseudo)')
    .eq('mission_id', missionId)
    .not('bid', 'is', null)
    .order('bid', { ascending: false });

  const bids = assignments?.map(a => ({
    playerId: a.player_id,
    pseudo: (a.player as unknown as { pseudo: string })?.pseudo,
    bid: a.bid,
  })) || [];

  const auctionData = mission.auction_data as AuctionData | null;

  return NextResponse.json({
    mission: {
      id: mission.id,
      title: mission.title,
      status: mission.status,
    },
    currentHighest: auctionData?.current_highest_bid ?? 0,
    currentHighestBidder: auctionData?.current_highest_bidder,
    biddingClosed: !!auctionData?.bid_phase_ends_at,
    bids,
  });
}
