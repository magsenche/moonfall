/**
 * Shop API - GET shop items, POST purchase
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ code: string }>;
}

// GET - List all shop items with player's purchase status
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { code } = await params;
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');

  // Get game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, status')
    .eq('code', code)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  // Get all active shop items
  const { data: items, error: itemsError } = await supabase
    .from('shop_items')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  // If playerId provided, get their purchases and points
  let playerData = null;
  if (playerId) {
    const { data: player } = await supabase
      .from('players')
      .select('id, pseudo, mission_points')
      .eq('id', playerId)
      .single();

    if (player) {
      // Get player's purchases in this game with item details
      const { data: purchases } = await supabase
        .from('player_purchases')
        .select(`
          id,
          shop_item_id,
          cost_paid,
          purchased_at,
          used_at,
          phase_used,
          target_player_id,
          shop_items (
            name,
            icon,
            effect_type
          )
        `)
        .eq('game_id', game.id)
        .eq('player_id', playerId);

      // Get how many times each item was bought in this game (for max_per_game limit)
      const { data: gamePurchases } = await supabase
        .from('player_purchases')
        .select('shop_item_id')
        .eq('game_id', game.id);

      const gamePurchaseCounts: Record<string, number> = {};
      gamePurchases?.forEach(p => {
        gamePurchaseCounts[p.shop_item_id] = (gamePurchaseCounts[p.shop_item_id] || 0) + 1;
      });

      // Count player's purchases per item
      const playerPurchaseCounts: Record<string, number> = {};
      purchases?.forEach(p => {
        playerPurchaseCounts[p.shop_item_id] = (playerPurchaseCounts[p.shop_item_id] || 0) + 1;
      });

      // Flatten purchases with item info
      const enrichedPurchases = purchases?.map(p => {
        const shopItem = p.shop_items as { name: string; icon: string; effect_type: string } | null;
        return {
          id: p.id,
          shop_item_id: p.shop_item_id,
          cost_paid: p.cost_paid,
          purchased_at: p.purchased_at,
          used_at: p.used_at,
          phase_used: p.phase_used,
          target_player_id: p.target_player_id,
          item_name: shopItem?.name ?? 'Pouvoir',
          item_icon: shopItem?.icon ?? '⚡',
          effect_type: shopItem?.effect_type ?? null,
        };
      }) ?? [];

      playerData = {
        id: player.id,
        pseudo: player.pseudo,
        points: player.mission_points ?? 0,
        purchases: enrichedPurchases,
        purchaseCounts: playerPurchaseCounts,
        unusedPowers: enrichedPurchases.filter(p => !p.used_at),
      };

      // Enrich items with availability for this player
      const enrichedItems = items?.map(item => ({
        ...item,
        purchased_count_player: playerPurchaseCounts[item.id] || 0,
        purchased_count_game: gamePurchaseCounts[item.id] || 0,
        can_buy: (
          (player.mission_points ?? 0) >= item.cost &&
          (item.max_per_player === null || (playerPurchaseCounts[item.id] || 0) < item.max_per_player) &&
          (item.max_per_game === null || (gamePurchaseCounts[item.id] || 0) < item.max_per_game) &&
          (item.available_phases?.includes(game.status ?? '') ?? true)
        ),
      }));

      return NextResponse.json({
        items: enrichedItems,
        player: playerData,
      });
    }
  }

  return NextResponse.json({
    items: items ?? [],
    player: null,
  });
}

// POST - Purchase an item
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { code } = await params;
  const supabase = await createClient();

  const body = await request.json();
  const { playerId, itemId } = body;

  if (!playerId || !itemId) {
    return NextResponse.json({ error: 'playerId and itemId required' }, { status: 400 });
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

  // Get player
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('id, pseudo, mission_points, is_alive')
    .eq('id', playerId)
    .eq('game_id', game.id)
    .single();

  if (playerError || !player) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }

  if (!player.is_alive) {
    return NextResponse.json({ error: 'Dead players cannot purchase' }, { status: 403 });
  }

  // Get shop item
  const { data: item, error: itemError } = await supabase
    .from('shop_items')
    .select('*')
    .eq('id', itemId)
    .eq('is_active', true)
    .single();

  if (itemError || !item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  // Check if player has enough points
  if ((player.mission_points ?? 0) < item.cost) {
    return NextResponse.json({ 
      error: 'Not enough points',
      required: item.cost,
      available: player.mission_points ?? 0,
    }, { status: 400 });
  }

  // Check phase availability
  if (item.available_phases && !item.available_phases.includes(game.status ?? '')) {
    return NextResponse.json({ 
      error: `This item can only be purchased during: ${item.available_phases.join(', ')}`,
    }, { status: 400 });
  }

  // Check max_per_player limit
  if (item.max_per_player !== null) {
    const { count } = await supabase
      .from('player_purchases')
      .select('id', { count: 'exact' })
      .eq('game_id', game.id)
      .eq('player_id', playerId)
      .eq('shop_item_id', itemId);

    if ((count ?? 0) >= item.max_per_player) {
      return NextResponse.json({ 
        error: `You can only buy this item ${item.max_per_player} time(s)`,
      }, { status: 400 });
    }
  }

  // Check max_per_game limit
  if (item.max_per_game !== null) {
    const { count } = await supabase
      .from('player_purchases')
      .select('id', { count: 'exact' })
      .eq('game_id', game.id)
      .eq('shop_item_id', itemId);

    if ((count ?? 0) >= item.max_per_game) {
      return NextResponse.json({ 
        error: 'This item is sold out for this game',
      }, { status: 400 });
    }
  }

  // Deduct points
  const { error: updateError } = await supabase
    .from('players')
    .update({ mission_points: (player.mission_points ?? 0) - item.cost })
    .eq('id', playerId);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to deduct points' }, { status: 500 });
  }

  // Create purchase
  const { data: purchase, error: purchaseError } = await supabase
    .from('player_purchases')
    .insert({
      game_id: game.id,
      player_id: playerId,
      shop_item_id: itemId,
      cost_paid: item.cost,
    })
    .select()
    .single();

  if (purchaseError) {
    // Refund points on failure
    await supabase
      .from('players')
      .update({ mission_points: player.mission_points })
      .eq('id', playerId);
    
    return NextResponse.json({ error: purchaseError.message }, { status: 500 });
  }

  // Log game event
  await supabase.from('game_events').insert({
    game_id: game.id,
    event_type: 'shop_purchase',
    actor_id: playerId,
    data: {
      item_name: item.name,
      item_id: itemId,
      cost: item.cost,
      effect_type: item.effect_type,
    },
  });

  return NextResponse.json({
    success: true,
    purchase: {
      id: purchase.id,
      item: {
        name: item.name,
        icon: item.icon,
        effect_type: item.effect_type,
      },
      cost_paid: item.cost,
    },
    new_balance: (player.mission_points ?? 0) - item.cost,
  });
}
