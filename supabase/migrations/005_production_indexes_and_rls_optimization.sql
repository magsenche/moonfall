-- Migration: Production readiness - Add missing indexes and optimize RLS policies
-- This improves query performance and reduces row-level policy evaluation overhead

-- ============================================================================
-- PART 1: Add indexes on foreign keys (performance optimization)
-- ============================================================================

-- votes table
CREATE INDEX IF NOT EXISTS idx_votes_voter_id ON votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_votes_target_id ON votes(target_id);

-- wolf_chat table
CREATE INDEX IF NOT EXISTS idx_wolf_chat_player_id ON wolf_chat(player_id);

-- power_uses table
CREATE INDEX IF NOT EXISTS idx_power_uses_power_id ON power_uses(power_id);
CREATE INDEX IF NOT EXISTS idx_power_uses_target_id ON power_uses(target_id);

-- game_events table
CREATE INDEX IF NOT EXISTS idx_game_events_actor_id ON game_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_game_events_target_id ON game_events(target_id);

-- missions table
CREATE INDEX IF NOT EXISTS idx_missions_template_id ON missions(template_id);
CREATE INDEX IF NOT EXISTS idx_missions_validated_by ON missions(validated_by);
CREATE INDEX IF NOT EXISTS idx_missions_winner_player_id ON missions(winner_player_id);

-- mission_templates table
CREATE INDEX IF NOT EXISTS idx_mission_templates_creator_id ON mission_templates(creator_id);

-- player_purchases table
CREATE INDEX IF NOT EXISTS idx_player_purchases_shop_item_id ON player_purchases(shop_item_id);
CREATE INDEX IF NOT EXISTS idx_player_purchases_target_player_id ON player_purchases(target_player_id);

-- lovers table
CREATE INDEX IF NOT EXISTS idx_lovers_player2_id ON lovers(player2_id);

-- wild_child_models table
CREATE INDEX IF NOT EXISTS idx_wild_child_models_child_player_id ON wild_child_models(child_player_id);
CREATE INDEX IF NOT EXISTS idx_wild_child_models_model_player_id ON wild_child_models(model_player_id);

-- salvateur_protections table
CREATE INDEX IF NOT EXISTS idx_salvateur_protections_salvateur_player_id ON salvateur_protections(salvateur_player_id);
CREATE INDEX IF NOT EXISTS idx_salvateur_protections_protected_player_id ON salvateur_protections(protected_player_id);

-- ============================================================================
-- PART 2: Optimize RLS policies - use (select auth.uid()) instead of auth.uid()
-- This prevents re-evaluation for each row
-- ============================================================================

-- Drop and recreate optimized policies for missions
DROP POLICY IF EXISTS "Players can view missions in their game" ON missions;
DROP POLICY IF EXISTS "MJ can manage missions" ON missions;

CREATE POLICY "Players can view missions in their game" ON missions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.game_id = missions.game_id
      AND players.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "MJ can manage missions" ON missions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.game_id = missions.game_id
      AND players.user_id = (SELECT auth.uid())
      AND players.is_mj = true
    )
  );

-- Drop and recreate optimized policies for player_purchases
DROP POLICY IF EXISTS "Players can view own purchases" ON player_purchases;
DROP POLICY IF EXISTS "Players can create purchases" ON player_purchases;
DROP POLICY IF EXISTS "Players can update own purchases" ON player_purchases;

CREATE POLICY "Players can view own purchases" ON player_purchases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = player_purchases.player_id
      AND players.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Players can create purchases" ON player_purchases
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = player_purchases.player_id
      AND players.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Players can update own purchases" ON player_purchases
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = player_purchases.player_id
      AND players.user_id = (SELECT auth.uid())
    )
  );

-- Drop and recreate optimized policy for push_subscriptions
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON push_subscriptions;

CREATE POLICY "Users can manage own subscriptions" ON push_subscriptions
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- PART 3: Remove duplicate permissive policies
-- ============================================================================

-- mission_templates: keep only "Anyone can view global templates"
DROP POLICY IF EXISTS "Anon can view global templates" ON mission_templates;

-- shop_items: keep only "Anyone can view active shop items"  
DROP POLICY IF EXISTS "Anon can read shop items" ON shop_items;

-- ============================================================================
-- PART 4: Add composite indexes for common query patterns
-- ============================================================================

-- Games by code lookup (most frequent query)
CREATE INDEX IF NOT EXISTS idx_games_code_status ON games(code, status);

-- Players in a game (very frequent)
CREATE INDEX IF NOT EXISTS idx_players_game_alive ON players(game_id, is_alive);

-- Votes by game and phase (frequent during voting)
CREATE INDEX IF NOT EXISTS idx_votes_game_phase ON votes(game_id, phase);

-- Missions by game and status
CREATE INDEX IF NOT EXISTS idx_missions_game_status ON missions(game_id, status);
