import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateGameCode } from '@/lib/utils';
import { DEFAULT_GAME_SETTINGS } from '@/types/game';
import type { Json } from '@/types/database';

const BOT_NAMES = [
  '🤖 Alice',
  '🤖 Bob', 
  '🤖 Charlie',
  '🤖 Diana',
  '🤖 Eve',
  '🤖 Frank',
  '🤖 Grace',
];

/**
 * POST /api/games/demo - Create a demo game with bots
 * 
 * Creates a game with:
 * - The user as a player (not MJ)
 * - 7 bots to fill the game (8 players total)
 * - autoMode enabled (no MJ needed)
 * - Starts the game immediately
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pseudo } = body;

    if (!pseudo) {
      return NextResponse.json(
        { error: 'Un pseudo est requis' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Generate a unique game code
    let code = generateGameCode();
    let attempts = 0;
    const maxAttempts = 10;

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

    // Create the game with autoMode enabled
    const demoSettings = {
      ...DEFAULT_GAME_SETTINGS,
      autoMode: true,
      councilIntervalMinutes: 0.25, // 15 seconds day phase for demo (fast)
      nightDurationMinutes: 0.5, // 30 seconds night for demo
      voteDurationMinutes: 0.5, // 30 seconds council for demo
    };

    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        code,
        name: `Partie Démo - ${pseudo}`,
        status: 'lobby',
        settings: demoSettings as unknown as Json,
      })
      .select()
      .single();

    if (gameError) {
      console.error('Error creating demo game:', gameError);
      return NextResponse.json(
        { error: 'Erreur lors de la création de la partie démo', details: gameError.message },
        { status: 500 }
      );
    }


    // Add the user as a regular player (not MJ, since autoMode is on)
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        game_id: game.id,
        pseudo,
        is_mj: false,
        is_alive: true,
      })
      .select()
      .single();

    if (playerError || !player) {
      console.error('Error adding player:', playerError);
      await supabase.from('games').delete().eq('id', game.id);
      return NextResponse.json(
        { error: 'Erreur lors de l\'ajout du joueur', details: playerError?.message },
        { status: 500 }
      );
    }

    // Add bots
    const bots = BOT_NAMES.map(name => ({
      game_id: game.id,
      pseudo: name,
      is_mj: false,
      is_alive: true,
    }));

    const { error: botsError } = await supabase
      .from('players')
      .insert(bots);

    if (botsError) {
      console.error('Error creating bots:', botsError);
      await supabase.from('games').delete().eq('id', game.id);
      return NextResponse.json(
        { error: 'Erreur lors de la création des bots', details: botsError.message },
        { status: 500 }
      );
    }

    // Get all roles for distribution
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .order('name');

    if (rolesError || !roles || roles.length === 0) {
      console.error('Error fetching roles:', rolesError);
      await supabase.from('games').delete().eq('id', game.id);
      return NextResponse.json(
        { error: 'Impossible de récupérer les rôles', details: rolesError?.message },
        { status: 500 }
      );
    }

    // Get all players (including bots)
    const { data: allPlayers, error: playersError } = await supabase
      .from('players')
      .select('id')
      .eq('game_id', game.id);

    if (playersError || !allPlayers) {
      console.error('Error fetching players:', playersError);
      await supabase.from('games').delete().eq('id', game.id);
      return NextResponse.json(
        { error: 'Impossible de récupérer les joueurs', details: playersError?.message },
        { status: 500 }
      );
    }

    const playerCount = allPlayers.length;

    // Basic role distribution for demo (8 players)
    // 2 loups, 4 personnages à pouvoir (voyante, sorcière, chasseur, petite fille), 2 villageois
    const loupRole = roles.find(r => r.name === 'loup_garou');
    const voyanteRole = roles.find(r => r.name === 'voyante');
    const sorciereRole = roles.find(r => r.name === 'sorciere');
    const chasseurRole = roles.find(r => r.name === 'chasseur');
    const petiteFilleRole = roles.find(r => r.name === 'petite_fille');
    const villageoisRole = roles.find(r => r.name === 'villageois');

    if (!loupRole || !voyanteRole || !sorciereRole || !chasseurRole || !petiteFilleRole || !villageoisRole) {
      console.error('Missing base roles:', { 
        loupRole: !!loupRole, 
        voyanteRole: !!voyanteRole, 
        sorciereRole: !!sorciereRole,
        chasseurRole: !!chasseurRole,
        petiteFilleRole: !!petiteFilleRole,
        villageoisRole: !!villageoisRole 
      });
      await supabase.from('games').delete().eq('id', game.id);
      return NextResponse.json(
        { error: 'Rôles de base introuvables' },
        { status: 500 }
      );
    }

    // Shuffle players
    const shuffledPlayers = [...allPlayers].sort(() => Math.random() - 0.5);

    // Assign roles: 2 loups + 4 à pouvoir + 2 villageois
    const roleAssignments = [];
    for (let i = 0; i < playerCount; i++) {
      let roleId;
      if (i < 2) {
        roleId = loupRole.id; // First 2 are wolves
      } else if (i === 2) {
        roleId = voyanteRole.id; // Seer
      } else if (i === 3) {
        roleId = sorciereRole.id; // Witch
      } else if (i === 4) {
        roleId = chasseurRole.id; // Hunter
      } else if (i === 5) {
        roleId = petiteFilleRole.id; // Little Girl
      } else {
        roleId = villageoisRole.id; // Last 2 are villagers
      }

      roleAssignments.push({
        id: shuffledPlayers[i].id,
        role_id: roleId,
      });
    }

    // Update players with roles
    for (const assignment of roleAssignments) {
      const { error: assignError } = await supabase
        .from('players')
        .update({ role_id: assignment.role_id })
        .eq('id', assignment.id);
      
      if (assignError) {
        console.error('Error assigning role:', assignError);
      }
    }

    // Start the game with proper phase timer
    const nightDurationMs = (demoSettings.nightDurationMinutes ?? 2) * 60 * 1000;
    const phaseEndsAt = new Date(Date.now() + nightDurationMs).toISOString();

    const { error: updateError } = await supabase
      .from('games')
      .update({
        status: 'nuit',
        current_phase: 1,
        started_at: new Date().toISOString(),
        phase_ends_at: phaseEndsAt,
      })
      .eq('id', game.id);

    if (updateError) {
      console.error('Error starting game:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors du démarrage de la partie', details: updateError.message },
        { status: 500 }
      );
    }

    // Log the event
    await supabase.from('game_events').insert({
      game_id: game.id,
      event_type: 'game_started',
      data: { mode: 'demo', started_by: pseudo },
    });

    // Add demo messages to wolf chat (for Little Girl to see)
    const wolves = roleAssignments.filter(ra => ra.role_id === loupRole.id);
    if (wolves.length > 0) {
      const wolfMessages = [
        { player_id: wolves[0].id, message: "J'ai faim 🐺" },
        { player_id: wolves[1]?.id || wolves[0].id, message: "On graille qui ce soir ? 🍽️" },
      ];

      for (const msg of wolfMessages) {
        await supabase.from('wolf_chat').insert({
          game_id: game.id,
          player_id: msg.player_id,
          message: msg.message,
        });
      }
    }

    // Create demo missions for the player to test the system
    await createDemoMissions(supabase, game.id, player.id);

    return NextResponse.json({
      success: true,
      code: game.code,
      playerId: player.id,
      message: 'Partie démo créée et lancée !',
    });
  } catch (error) {
    console.error('Unexpected error in demo route:', error);
    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * Create simple demo missions with auto-validation
 * These missions help the player test the mission & shop system
 */
async function createDemoMissions(supabase: Awaited<ReturnType<typeof createClient>>, gameId: string, playerId: string) {
  const demoMissions = [
    {
      title: '🎯 Mission de Bienvenue',
      description: 'Première mission ! Clique sur "Soumettre" pour valider et gagner 10 points.',
      difficulty: 1,
      time_limit_seconds: null,
      reward_points: 10,
      validation_type: 'self' as const, // Auto-validation
    },
    {
      title: '🧠 Quiz Express',
      description: 'Combien de loups-garous y a-t-il dans cette partie ? (Réponse: 2)',
      difficulty: 2,
      time_limit_seconds: 120,
      reward_points: 15,
      validation_type: 'self' as const,
    },
    {
      title: '🎭 Teste ton Rôle',
      description: 'Quel est ton rôle secret ? Regarde ta carte de rôle et soumets cette mission.',
      difficulty: 1,
      time_limit_seconds: null,
      reward_points: 10,
      validation_type: 'self' as const,
    },
    {
      title: '🛒 Découvre le Shop',
      description: 'Va dans le shop (icône panier) et découvre les objets disponibles. Soumets quand c\'est fait !',
      difficulty: 2,
      time_limit_seconds: null,
      reward_points: 20,
      validation_type: 'self' as const,
    },
    {
      title: '🎮 Maître du Jeu',
      description: 'Vote au conseil et utilise tes points dans le shop. Mission avancée !',
      difficulty: 3,
      time_limit_seconds: null,
      reward_points: 25,
      validation_type: 'self' as const,
    },
  ];

  // Create missions one by one, assigning them directly to the player
  for (let i = 0; i < demoMissions.length; i++) {
    const missionData = demoMissions[i];
    
    // Create the mission
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .insert({
        game_id: gameId,
        type: 'demo', // Mark as demo mission
        status: 'in_progress', // Active immediately
        ...missionData,
      })
      .select()
      .single();

    if (missionError || !mission) {
      console.error('Error creating demo mission:', missionError);
      continue;
    }

    // Assign it to the player immediately (status: 'assigned' = ready to do)
    const { error: assignError } = await supabase
      .from('mission_assignments')
      .insert({
        mission_id: mission.id,
        player_id: playerId,
        status: 'assigned',
      });

    if (assignError) {
      console.error('Error assigning demo mission:', assignError);
    }
  }
}
