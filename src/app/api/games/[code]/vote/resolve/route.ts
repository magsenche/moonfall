import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

/**
 * Lazy Voting: Force bots to vote randomly before resolution
 * This ensures the game never gets stuck when bots are present
 */
async function forceBotVotes(gameId: string, phase: number) {
  // Get all alive players
  const { data: alivePlayers } = await supabase
    .from('players')
    .select('id, pseudo, is_alive')
    .eq('game_id', gameId)
    .eq('is_alive', true);

  if (!alivePlayers || alivePlayers.length === 0) return;

  // Get existing votes
  const { data: existingVotes } = await supabase
    .from('votes')
    .select('voter_id')
    .eq('game_id', gameId)
    .eq('phase', phase)
    .eq('vote_type', 'jour');

  const votedIds = new Set(existingVotes?.map(v => v.voter_id) ?? []);

  // Find bots who haven't voted
  const botsToVote = alivePlayers.filter(
    p => p.pseudo.startsWith('🤖') && !votedIds.has(p.id)
  );

  if (botsToVote.length === 0) return;

  // Get potential targets (alive players, excluding the bot itself)
  const targets = alivePlayers.filter(p => p.is_alive);

  // Make each bot vote randomly
  const botVotes = botsToVote.map(bot => {
    // Filter out the bot itself from targets
    const validTargets = targets.filter(t => t.id !== bot.id);
    const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
    
    return {
      game_id: gameId,
      voter_id: bot.id,
      target_id: randomTarget.id,
      vote_type: 'jour' as const,
      phase,
    };
  });

  if (botVotes.length > 0) {
    await supabase.from('votes').insert(botVotes);
  }
}

/**
 * Auto-activate bot hunter power when they die
 * Hunters shoot a random alive player when eliminated
 */
async function autoBotHunterShoot(gameId: string, deadPlayerId: string, phase: number) {
  // Check if dead player is a bot hunter
  const { data: deadPlayer } = await supabase
    .from("players")
    .select("id, pseudo, role:roles(id, name)")
    .eq("id", deadPlayerId)
    .single();

  if (!deadPlayer || !deadPlayer.pseudo.startsWith('🤖')) return null;
  
  const role = deadPlayer.role as { id: string; name: string } | null;
  if (!role || role.name !== 'chasseur') return null;

  // Get the tir_mortel power
  const { data: hunterPower } = await supabase
    .from("powers")
    .select("id")
    .eq("role_id", role.id)
    .eq("name", "tir_mortel")
    .single();

  if (!hunterPower) return null;

  // Check if already used
  const { data: powerUse } = await supabase
    .from("power_uses")
    .select("id")
    .eq("game_id", gameId)
    .eq("player_id", deadPlayerId)
    .eq("power_id", hunterPower.id)
    .maybeSingle();

  if (powerUse) return null; // Already used

  // Get all alive players (random target)
  const { data: alivePlayers } = await supabase
    .from("players")
    .select("id, pseudo")
    .eq("game_id", gameId)
    .eq("is_alive", true);

  if (!alivePlayers || alivePlayers.length === 0) return null;

  // Pick random target
  const randomTarget = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];

  // Kill the target
  const { data: shotVictim } = await supabase
    .from("players")
    .update({
      is_alive: false,
      death_reason: "tir_chasseur",
      death_at: new Date().toISOString(),
    })
    .eq("id", randomTarget.id)
    .select("pseudo, role:roles(name)")
    .single();

  if (!shotVictim) return null;

  // Record power use
  await supabase.from("power_uses").insert({
    game_id: gameId,
    player_id: deadPlayerId,
    power_id: hunterPower.id,
    target_id: randomTarget.id,
    phase,
    result: { auto_bot: true },
  });

  // Log event
  await supabase.from("game_events").insert({
    game_id: gameId,
    event_type: "hunter_shot",
    data: {
      hunter_id: deadPlayerId,
      hunter_name: deadPlayer.pseudo,
      victim_id: randomTarget.id,
      victim_name: shotVictim.pseudo,
      victim_role: (shotVictim.role as { name: string } | null)?.name,
      auto_bot: true,
    },
  });

  return {
    victimId: randomTarget.id,
    victimPseudo: shotVictim.pseudo,
    victimRole: (shotVictim.role as { name: string } | null)?.name,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  // Get game with settings
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
      { error: 'La résolution n\'est possible que pendant le conseil' },
      { status: 400 }
    );
  }

  // Get settings for night duration
  const settings = (game.settings || {}) as { autoMode?: boolean; nightDurationMinutes?: number };
  const isAutoMode = settings.autoMode ?? false;

  const currentPhase = game.current_phase ?? 1;

  // LAZY VOTING: Force bots to vote before resolution
  await forceBotVotes(game.id, currentPhase);

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
  // Build map of players with anonymous vote
  const anonymousVoters = new Set<string>();
  
  doubleVotePowers?.forEach(p => {
    const effectType = (p.shop_items as unknown as { effect_type: string })?.effect_type;
    if (effectType === 'double_vote') {
      doubleVoters.add(p.player_id);
    }
    if (effectType === 'anonymous_vote') {
      anonymousVoters.add(p.player_id);
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

  // Get player pseudos for vote details
  const { data: allPlayers } = await supabase
    .from('players')
    .select('id, pseudo')
    .eq('game_id', game.id);
  
  const playerMap = new Map(allPlayers?.map(p => [p.id, p.pseudo]) ?? []);
  
  // Build vote details for display
  const voteDetails = (votes ?? []).map(vote => ({
    voterId: vote.voter_id,
    voterPseudo: playerMap.get(vote.voter_id) ?? 'Inconnu',
    targetId: vote.target_id!,
    targetPseudo: playerMap.get(vote.target_id!) ?? 'Inconnu',
    isAnonymous: anonymousVoters.has(vote.voter_id),
    isDouble: doubleVoters.has(vote.voter_id),
  }));

  // Mark double_vote and anonymous_vote powers as used
  for (const power of doubleVotePowers ?? []) {
    const effectType = (power.shop_items as unknown as { effect_type: string })?.effect_type;
    if (effectType === 'double_vote' || effectType === 'anonymous_vote') {
      // Check if this player actually voted
      const playerVoted = votes?.some(v => v.voter_id === power.player_id);
      if (playerVoted) {
        await supabase
          .from('player_purchases')
          .update({
            used_at: new Date().toISOString(),
            phase_used: currentPhase,
            result: { effect: effectType === 'double_vote' ? 'vote counted as 2' : 'vote hidden' },
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
  let hunterShot = null;
  
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

      // Check if eliminated player was a bot hunter and auto-shoot
      hunterShot = await autoBotHunterShoot(game.id, player.id, currentPhase);
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
      hunterShot,
      gameOver: true,
      winner,
      voteCounts,
      voteDetails,
    });
  }

  // Transition to night
  // In auto mode, night phase has a timer. In normal mode, no timer (wolves act when ready)
  let nightPhaseEndsAt: string | null = null;
  if (isAutoMode) {
    const nightDurationSeconds = (settings.nightDurationMinutes ?? 2) * 60;
    nightPhaseEndsAt = new Date(Date.now() + nightDurationSeconds * 1000).toISOString();
  }

  await supabase
    .from('games')
    .update({
      status: 'nuit',
      current_phase: currentPhase + 1,
      phase_ends_at: nightPhaseEndsAt,
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
    hunterShot,
    tie: eliminated.length > 1,
    immunityUsed,
    gameOver: false,
    voteCounts,
    voteDetails,
    nextPhase: 'nuit',
  });
}
