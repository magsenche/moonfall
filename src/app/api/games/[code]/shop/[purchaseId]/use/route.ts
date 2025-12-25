/**
 * Shop Powers API - Use purchased powers
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database';

interface RouteParams {
  params: Promise<{ code: string; purchaseId: string }>;
}

// POST - Use a purchased power
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { code, purchaseId } = await params;
  const supabase = await createClient();

  const body = await request.json();
  const { playerId, targetPlayerId } = body;

  if (!playerId) {
    return NextResponse.json({ error: 'playerId required' }, { status: 400 });
  }

  // Get game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, status, current_phase')
    .eq('code', code)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  // Get the purchase with item details
  const { data: purchase, error: purchaseError } = await supabase
    .from('player_purchases')
    .select(`
      *,
      shop_items (*)
    `)
    .eq('id', purchaseId)
    .eq('player_id', playerId)
    .eq('game_id', game.id)
    .single();

  if (purchaseError || !purchase) {
    return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
  }

  if (purchase.used_at) {
    return NextResponse.json({ error: 'This power has already been used' }, { status: 400 });
  }

  const item = purchase.shop_items;
  if (!item) {
    return NextResponse.json({ error: 'Shop item not found' }, { status: 404 });
  }

  // Check if power can be used in current phase
  if (item.usable_phases && !item.usable_phases.includes(game.status ?? '')) {
    return NextResponse.json({ 
      error: `This power can only be used during: ${item.usable_phases.join(', ')}`,
      current_phase: game.status,
    }, { status: 400 });
  }

  // Execute effect based on type
  let result: Record<string, unknown> = {};
  const effectType = item.effect_type;

  switch (effectType) {
    case 'wolf_vision': {
      // Requires a target
      if (!targetPlayerId) {
        return NextResponse.json({ error: 'Target player required for wolf vision' }, { status: 400 });
      }

      // Get target's role
      const { data: target } = await supabase
        .from('players')
        .select('id, pseudo, role_id, roles(team)')
        .eq('id', targetPlayerId)
        .eq('game_id', game.id)
        .single();

      if (!target) {
        return NextResponse.json({ error: 'Target player not found' }, { status: 404 });
      }

      const team = (target.roles as { team: string } | null)?.team;
      result = {
        target_name: target.pseudo,
        is_wolf: team === 'loups',
        message: team === 'loups' 
          ? `🐺 ${target.pseudo} est un LOUP !`
          : `✅ ${target.pseudo} n'est PAS un loup.`,
      };
      break;
    }

    case 'immunity':
    case 'double_vote':
    case 'anonymous_vote':
      // These are passive effects checked during voting
      result = {
        message: `Pouvoir activé ! Il sera appliqué automatiquement.`,
        effect: effectType,
      };
      break;

    case 'silence': {
      if (!targetPlayerId) {
        return NextResponse.json({ error: 'Target player required for silence' }, { status: 400 });
      }

      const { data: target } = await supabase
        .from('players')
        .select('id, pseudo')
        .eq('id', targetPlayerId)
        .eq('game_id', game.id)
        .single();

      if (!target) {
        return NextResponse.json({ error: 'Target player not found' }, { status: 404 });
      }

      result = {
        target_name: target.pseudo,
        message: `🤫 ${target.pseudo} ne peut plus parler pendant 2 minutes !`,
        expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
      };
      break;
    }

    case 'mj_question':
      result = {
        message: `❓ Tu peux poser une question oui/non au MJ.`,
        awaiting_question: true,
      };
      break;

    default:
      result = {
        message: `Pouvoir ${effectType} activé.`,
      };
  }

  // Mark purchase as used
  const { error: updateError } = await supabase
    .from('player_purchases')
    .update({
      used_at: new Date().toISOString(),
      phase_used: game.current_phase,
      target_player_id: targetPlayerId || null,
      result: result as Json,
    })
    .eq('id', purchaseId);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to use power' }, { status: 500 });
  }

  // Log game event
  await supabase.from('game_events').insert({
    game_id: game.id,
    event_type: 'power_used',
    actor_id: playerId,
    target_id: targetPlayerId || null,
    data: {
      power_type: 'shop',
      effect_type: effectType,
      item_name: item.name,
      result,
    } as Json,
  });

  return NextResponse.json({
    success: true,
    effect_type: effectType,
    result,
  });
}
