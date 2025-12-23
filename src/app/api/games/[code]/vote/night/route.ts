import { createClient } from "@/lib/supabase/client";
import { NextRequest, NextResponse } from "next/server";

// POST - Submit a wolf vote (night phase)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { visitorId, targetId } = body;

  if (!visitorId || !targetId) {
    return NextResponse.json(
      { error: "visitorId et targetId requis" },
      { status: 400 }
    );
  }

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

  if (game.status === "lobby" || game.status === "terminee") {
    return NextResponse.json(
      { error: "La partie n'est pas en cours" },
      { status: 400 }
    );
  }

  if (game.status !== "nuit") {
    return NextResponse.json(
      { error: "Ce n'est pas la nuit" },
      { status: 400 }
    );
  }

  // Verify voter is a wolf and alive
  const { data: voter, error: voterError } = await supabase
    .from("players")
    .select("id, is_alive, role:roles(name, team)")
    .eq("id", visitorId)
    .eq("game_id", game.id)
    .single();

  if (voterError || !voter) {
    return NextResponse.json({ error: "Joueur non trouvé" }, { status: 404 });
  }

  if (!voter.is_alive) {
    return NextResponse.json(
      { error: "Les morts ne votent pas" },
      { status: 400 }
    );
  }

  const voterRole = voter.role as { name: string; team: string } | null;
  if (!voterRole || voterRole.team !== "loups") {
    return NextResponse.json(
      { error: "Seuls les loups votent la nuit" },
      { status: 403 }
    );
  }

  // Verify target is alive and not a wolf
  const { data: target, error: targetError } = await supabase
    .from("players")
    .select("id, is_alive, is_mj, role:roles(team)")
    .eq("id", targetId)
    .eq("game_id", game.id)
    .single();

  if (targetError || !target) {
    return NextResponse.json({ error: "Cible non trouvée" }, { status: 404 });
  }

  if (!target.is_alive || target.is_mj) {
    return NextResponse.json(
      { error: "Cible invalide" },
      { status: 400 }
    );
  }

  const targetRole = target.role as { team: string } | null;
  if (targetRole?.team === "loups") {
    return NextResponse.json(
      { error: "Les loups ne peuvent pas se dévorer entre eux" },
      { status: 400 }
    );
  }

  // Check if already voted this night
  const { data: existingVote } = await supabase
    .from("votes")
    .select("id")
    .eq("game_id", game.id)
    .eq("voter_id", visitorId)
    .eq("vote_type", "nuit_loup")
    .eq("phase", game.current_phase ?? 1);

  if (existingVote && existingVote.length > 0) {
    // Update existing vote
    const { error: updateError } = await supabase
      .from("votes")
      .update({ target_id: targetId })
      .eq("id", existingVote[0].id);

    if (updateError) {
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour du vote" },
        { status: 500 }
      );
    }
  } else {
    // Insert new vote
    const { error: voteError } = await supabase.from("votes").insert({
      game_id: game.id,
      voter_id: visitorId,
      target_id: targetId,
      vote_type: "nuit_loup",
      phase: game.current_phase ?? 1,
    });

    if (voteError) {
      return NextResponse.json(
        { error: "Erreur lors du vote" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
