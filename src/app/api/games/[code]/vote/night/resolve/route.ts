import { createClient } from "@/lib/supabase/client";
import { NextRequest, NextResponse } from "next/server";

// POST - Resolve night vote (wolf attack)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = createClient();

  // Get game
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, status, current_phase")
    .eq("code", code)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: "Partie non trouvée" }, { status: 404 });
  }

  if (game.status !== "nuit") {
    return NextResponse.json(
      { error: "Ce n'est pas la nuit" },
      { status: 400 }
    );
  }

  // Get all wolves alive
  const { data: wolves } = await supabase
    .from("players")
    .select("id, role:roles(team)")
    .eq("game_id", game.id)
    .eq("is_alive", true);

  const aliveWolves = wolves?.filter(
    (p) => (p.role as { team: string } | null)?.team === "loups"
  ) || [];

  // Get night votes
  const { data: votes } = await supabase
    .from("votes")
    .select("voter_id, target_id")
    .eq("game_id", game.id)
    .eq("vote_type", "nuit_loup")
    .eq("phase", game.current_phase ?? 1);

  // Check if all wolves have voted
  const wolfVotes = votes?.filter((v) =>
    aliveWolves.some((w) => w.id === v.voter_id)
  ) || [];

  if (wolfVotes.length < aliveWolves.length) {
    return NextResponse.json(
      { 
        error: "Tous les loups n'ont pas voté",
        voted: wolfVotes.length,
        total: aliveWolves.length
      },
      { status: 400 }
    );
  }

  // Count votes for each target
  const voteCounts: Record<string, number> = {};
  for (const vote of wolfVotes) {
    voteCounts[vote.target_id] = (voteCounts[vote.target_id] || 0) + 1;
  }

  // Find the target with most votes
  let maxVotes = 0;
  let victims: string[] = [];

  for (const [targetId, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count;
      victims = [targetId];
    } else if (count === maxVotes) {
      victims.push(targetId);
    }
  }

  // In case of tie, pick randomly
  const victimId = victims[Math.floor(Math.random() * victims.length)];

  // Kill the victim
  const { data: victim, error: killError } = await supabase
    .from("players")
    .update({
      is_alive: false,
      death_reason: "devore",
      death_at: new Date().toISOString(),
    })
    .eq("id", victimId)
    .select("pseudo, role:roles(name)")
    .single();

  if (killError) {
    return NextResponse.json(
      { error: "Erreur lors de l'élimination" },
      { status: 500 }
    );
  }

  // Log the event
  await supabase.from("game_events").insert({
    game_id: game.id,
    event_type: "wolf_kill",
    data: {
      victim_id: victimId,
      victim_name: victim.pseudo,
      victim_role: (victim.role as { name: string } | null)?.name,
    },
  });

  // Check victory conditions
  const { data: alivePlayers } = await supabase
    .from("players")
    .select("id, is_mj, role:roles(team)")
    .eq("game_id", game.id)
    .eq("is_alive", true);

  const aliveNonMJ = alivePlayers?.filter((p) => !p.is_mj) || [];
  const remainingWolves = aliveNonMJ.filter(
    (p) => (p.role as { team: string } | null)?.team === "loups"
  );
  const remainingVillagers = aliveNonMJ.filter(
    (p) => (p.role as { team: string } | null)?.team !== "loups"
  );

  let winner: string | null = null;

  if (remainingWolves.length === 0) {
    winner = "village";
  } else if (remainingWolves.length >= remainingVillagers.length) {
    winner = "loups";
  }

  if (winner) {
    // Game over
    await supabase
      .from("games")
      .update({ status: "terminee" })
      .eq("id", game.id);

    await supabase.from("game_events").insert({
      game_id: game.id,
      event_type: "game_ended",
      data: { winner },
    });

    return NextResponse.json({
      success: true,
      victim: victim.pseudo,
      victimRole: (victim.role as { name: string } | null)?.name,
      gameOver: true,
      winner,
    });
  }

  // Transition to day
  await supabase
    .from("games")
    .update({ status: "jour" })
    .eq("id", game.id);

  return NextResponse.json({
    success: true,
    victim: victim.pseudo,
    victimRole: (victim.role as { name: string } | null)?.name,
    gameOver: false,
  });
}
