import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  // Get game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, status, current_phase')
    .eq('code', code)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: 'Partie non trouvée' }, { status: 404 });
  }

  if (game.status !== 'conseil') {
    return NextResponse.json(
      { error: 'La résolution n\'est possible que pendant le conseil' },
      { status: 400 }
    );
  }

  const currentPhase = game.current_phase ?? 1;

  // Get all votes for this phase
  const { data: votes, error: votesError } = await supabase
    .from('votes')
    .select('voter_id, target_id')
    .eq('game_id', game.id)
    .eq('phase', currentPhase)
    .eq('vote_type', 'jour');

  if (votesError) {
    return NextResponse.json({ error: 'Erreur lors de la récupération des votes' }, { status: 500 });
  }

  // Check for double_vote powers (unused purchases)
  const { data: doubleVotePowers } = await supabase
    .from('player_purchases')
    .select(`
      id,
      player_id,
      shop_items!inner(effect_type)
    `)
    .eq('game_id', game.id)
    .is('used_at', null);

  // Build map of players with double vote
  const doubleVoters = new Set<string>();
  doubleVotePowers?.forEach(p => {
    if ((p.shop_items as unknown as { effect_type: string })?.effect_type === 'double_vote') {
      doubleVoters.add(p.player_id);
    }
  });

  // Count votes for each target (with double vote bonus)
  const voteCounts: Record<string, number> = {};
  for (const vote of votes ?? []) {
    if (vote.target_id) {
      const multiplier = doubleVoters.has(vote.voter_id) ? 2 : 1;
      voteCounts[vote.target_id] = (voteCounts[vote.target_id] || 0) + multiplier;
    }
  }

  // Mark double_vote powers as used
  for (const power of doubleVotePowers ?? []) {
    if ((power.shop_items as unknown as { effect_type: string })?.effect_type === 'double_vote') {
      // Check if this player actually voted
      const playerVoted = votes?.some(v => v.voter_id === power.player_id);
      if (playerVoted) {
        await supabase
          .from('player_purchases')
          .update({
            used_at: new Date().toISOString(),
            phase_used: currentPhase,
            result: { effect: 'vote counted as 2' },
          })
          .eq('id', power.id);
      }
    }
  }

  // Find player(s) with most votes
  let maxVotes = 0;
  let eliminated: string[] = [];
  
  for (const [targetId, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count;
      eliminated = [targetId];
    } else if (count === maxVotes) {
      eliminated.push(targetId);
    }
  }

  // Check for immunity powers on the potential eliminated player
  let immunityUsed = false;
  if (eliminated.length === 1 && maxVotes > 0) {
    const { data: immunityPower } = await supabase
      .from('player_purchases')
      .select(`
        id,
        player_id,
        shop_items!inner(effect_type)
      `)
      .eq('game_id', game.id)
      .eq('player_id', eliminated[0])
      .is('used_at', null)
      .limit(1);

    const hasImmunity = immunityPower?.some(p => 
      (p.shop_items as unknown as { effect_type: string })?.effect_type === 'immunity'
    );

    if (hasImmunity) {
      // Use the immunity
      const immunityPurchase = immunityPower?.find(p => 
        (p.shop_items as unknown as { effect_type: string })?.effect_type === 'immunity'
      );
      
      if (immunityPurchase) {
        await supabase
          .from('player_purchases')
          .update({
            used_at: new Date().toISOString(),
            phase_used: currentPhase,
            result: { effect: 'survived elimination by vote' },
          })
          .eq('id', immunityPurchase.id);
        
        immunityUsed = true;
        
        // Log event
        await supabase.from('game_events').insert({
          game_id: game.id,
          event_type: 'immunity_used',
          actor_id: eliminated[0],
          data: {
            votes_against: maxVotes,
            phase: currentPhase,
          },
        });
      }
    }
  }

  // Get eliminated player info
  let eliminatedPlayer = null;
  
  // Only eliminate if there's a clear winner (no tie) AND no immunity
  if (eliminated.length === 1 && maxVotes > 0 && !immunityUsed) {
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, pseudo, role_id')
      .eq('id', eliminated[0])
      .single();

    if (player && !playerError) {
      // Kill the player
      await supabase
        .from('players')
        .update({
          is_alive: false,
          death_reason: 'vote',
          death_at: new Date().toISOString(),
        })
        .eq('id', player.id);

      // Get their role for the reveal
      const { data: role } = await supabase
        .from('roles')
        .select('name, team')
        .eq('id', player.role_id!)
        .single();

      eliminatedPlayer = {
        id: player.id,
        pseudo: player.pseudo,
        role: role?.name ?? 'inconnu',
        team: role?.team ?? 'inconnu',
      };

      // Log event
      await supabase.from('game_events').insert({
        game_id: game.id,
        event_type: 'player_eliminated',
        data: {
          playerId: player.id,
          pseudo: player.pseudo,
          reason: 'vote',
          phase: currentPhase,
          votes: maxVotes,
        },
      });
    }
  }

  // Check for victory conditions
  const { data: remainingPlayers } = await supabase
    .from('players')
    .select('id, role_id')
    .eq('game_id', game.id)
    .eq('is_alive', true)
    .eq('is_mj', false);

  // Get roles to check teams
  const { data: roles } = await supabase
    .from('roles')
    .select('id, team');

  const roleTeams = new Map(roles?.map(r => [r.id, r.team]));
  
  const wolves = remainingPlayers?.filter(p => roleTeams.get(p.role_id!) === 'loups') ?? [];
  const villagers = remainingPlayers?.filter(p => roleTeams.get(p.role_id!) !== 'loups') ?? [];

  let winner: string | null = null;
  
  if (wolves.length === 0) {
    winner = 'village';
  } else if (wolves.length >= villagers.length) {
    winner = 'loups';
  }

  if (winner) {
    // End the game
    await supabase
      .from('games')
      .update({ status: 'terminee' })
      .eq('id', game.id);

    await supabase.from('game_events').insert({
      game_id: game.id,
      event_type: 'game_ended',
      data: { winner },
    });

    return NextResponse.json({
      success: true,
      eliminated: eliminatedPlayer,
      gameOver: true,
      winner,
      voteCounts,
    });
  }

  // Transition to night (no timer for night - wolves act when ready)
  await supabase
    .from('games')
    .update({
      status: 'nuit',
      current_phase: currentPhase + 1,
      phase_ends_at: null, // Clear timer for night phase
    })
    .eq('id', game.id);

  await supabase.from('game_events').insert({
    game_id: game.id,
    event_type: 'phase_changed',
    data: { 
      from: 'conseil', 
      to: 'nuit', 
      phase: currentPhase + 1 
    },
  });

  return NextResponse.json({
    success: true,
    eliminated: eliminatedPlayer,
    tie: eliminated.length > 1,
    immunityUsed,
    gameOver: false,
    voteCounts,
    nextPhase: 'nuit',
  });
}
