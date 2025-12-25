-- ============================================
-- Migration: Points & Shop System
-- Adds point-based economy for missions with shop for purchasing powers
-- ============================================

-- ============================================
-- NEW ENUM: Shop effect types
-- ============================================

CREATE TYPE shop_effect_type AS ENUM (
  'immunity',        -- Cannot be eliminated at next council
  'double_vote',     -- Vote counts as 2
  'wolf_vision',     -- Know if a player is wolf or not
  'anonymous_vote',  -- Your vote is hidden
  'mj_question',     -- Ask MJ a yes/no question
  'silence',         -- Target cannot speak for 2 minutes
  'extra_life',      -- Survive one attack (for special roles)
  'role_swap'        -- Swap roles with another player (advanced)
);

-- ============================================
-- SHOP ITEMS (Global configuration)
-- ============================================

CREATE TABLE shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  cost INTEGER NOT NULL CHECK (cost > 0),
  effect_type shop_effect_type NOT NULL,
  effect_data JSONB DEFAULT '{}', -- Additional config per effect
  icon VARCHAR(10), -- Emoji
  
  -- Limits
  max_per_game INTEGER, -- Max times this can be bought per game (NULL = unlimited)
  max_per_player INTEGER DEFAULT 1, -- Max times a player can buy this (NULL = unlimited)
  
  -- Availability
  available_phases TEXT[] DEFAULT ARRAY['jour', 'conseil'], -- When can be bought
  usable_phases TEXT[] DEFAULT ARRAY['conseil'], -- When can be used
  
  -- Metadata
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shop_items_active ON shop_items(is_active) WHERE is_active = true;

-- ============================================
-- PLAYER PURCHASES (What players bought)
-- ============================================

CREATE TABLE player_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  shop_item_id UUID NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  
  -- Purchase info
  cost_paid INTEGER NOT NULL, -- Points spent (could differ from item cost if discounted)
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Usage tracking
  used_at TIMESTAMPTZ, -- NULL = not yet used
  phase_used INTEGER, -- Which game phase it was used in
  target_player_id UUID REFERENCES players(id) ON DELETE SET NULL, -- If effect targets someone
  result JSONB, -- Outcome of using the power
  
  -- Index for fast lookups
  CONSTRAINT unique_purchase UNIQUE(game_id, player_id, shop_item_id, purchased_at)
);

CREATE INDEX idx_player_purchases_game ON player_purchases(game_id);
CREATE INDEX idx_player_purchases_player ON player_purchases(player_id);
CREATE INDEX idx_player_purchases_unused ON player_purchases(player_id) WHERE used_at IS NULL;

-- ============================================
-- ALTER PLAYERS: Add mission points
-- ============================================

ALTER TABLE players ADD COLUMN IF NOT EXISTS mission_points INTEGER DEFAULT 0;

-- ============================================
-- ALTER MISSIONS: Add difficulty for point rewards
-- ============================================

ALTER TABLE missions ADD COLUMN IF NOT EXISTS difficulty INTEGER DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 5);

-- ============================================
-- ALTER MISSION_TEMPLATES: Add difficulty
-- ============================================

ALTER TABLE mission_templates ADD COLUMN IF NOT EXISTS difficulty INTEGER DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 5);

-- ============================================
-- FUNCTION: Award points to player
-- ============================================

CREATE OR REPLACE FUNCTION award_mission_points(
  p_player_id UUID,
  p_points INTEGER,
  p_reason TEXT DEFAULT 'mission_complete'
) RETURNS INTEGER AS $$
DECLARE
  new_total INTEGER;
BEGIN
  UPDATE players 
  SET mission_points = COALESCE(mission_points, 0) + p_points
  WHERE id = p_player_id
  RETURNING mission_points INTO new_total;
  
  RETURN new_total;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Spend points (with validation)
-- ============================================

CREATE OR REPLACE FUNCTION spend_points(
  p_player_id UUID,
  p_points INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  current_points INTEGER;
BEGIN
  SELECT mission_points INTO current_points FROM players WHERE id = p_player_id;
  
  IF current_points IS NULL OR current_points < p_points THEN
    RETURN FALSE;
  END IF;
  
  UPDATE players SET mission_points = mission_points - p_points WHERE id = p_player_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_purchases ENABLE ROW LEVEL SECURITY;

-- Shop items: Everyone can read active items
CREATE POLICY "Anyone can view active shop items" ON shop_items
  FOR SELECT USING (is_active = true);

-- Player purchases: Players can view their own purchases
CREATE POLICY "Players can view own purchases" ON player_purchases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players WHERE players.id = player_id AND players.user_id = auth.uid()
    )
  );

-- Player purchases: Players can create purchases
CREATE POLICY "Players can create purchases" ON player_purchases
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.id = player_id 
      AND players.user_id = auth.uid()
      AND players.is_alive = true
    )
  );

-- Player purchases: Players can update their own (to mark as used)
CREATE POLICY "Players can update own purchases" ON player_purchases
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM players WHERE players.id = player_id AND players.user_id = auth.uid()
    )
  );

-- ============================================
-- ANON POLICIES (Prototype mode)
-- ============================================

CREATE POLICY "Anon can read shop items" ON shop_items
  FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can read purchases" ON player_purchases
  FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can create purchases" ON player_purchases
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update purchases" ON player_purchases
  FOR UPDATE TO anon USING (true);

-- ============================================
-- SEED: Default shop items
-- ============================================

INSERT INTO shop_items (name, description, cost, effect_type, icon, max_per_player, available_phases, usable_phases, sort_order) VALUES
  ('Immunité', 'Tu ne peux pas être éliminé au prochain conseil.', 20, 'immunity', '🛡️', 1, ARRAY['jour', 'nuit'], ARRAY['conseil'], 1),
  ('Vote Double', 'Ton vote compte double au prochain conseil.', 10, 'double_vote', '✌️', 2, ARRAY['jour', 'nuit'], ARRAY['conseil'], 2),
  ('Vision Loup', 'Découvre si un joueur est loup ou villageois.', 15, 'wolf_vision', '👁️', 3, ARRAY['jour', 'nuit'], ARRAY['jour', 'nuit'], 3),
  ('Vote Anonyme', 'Ton vote au prochain conseil reste secret.', 8, 'anonymous_vote', '🎭', 2, ARRAY['jour', 'nuit'], ARRAY['conseil'], 4),
  ('Question MJ', 'Pose une question oui/non au MJ sur le jeu.', 5, 'mj_question', '❓', NULL, ARRAY['jour', 'conseil', 'nuit'], ARRAY['jour', 'conseil', 'nuit'], 5),
  ('Silence', 'Un joueur de ton choix ne peut pas parler pendant 2 minutes.', 12, 'silence', '🤫', 1, ARRAY['jour', 'conseil'], ARRAY['jour', 'conseil'], 6);

-- ============================================
-- UPDATE TEMPLATES: Add difficulty to existing templates
-- ============================================

UPDATE mission_templates SET difficulty = 1 WHERE reward_type = 'none';
UPDATE mission_templates SET difficulty = 2 WHERE reward_type IN ('silence');
UPDATE mission_templates SET difficulty = 3 WHERE reward_type IN ('double_vote', 'extra_vision');
UPDATE mission_templates SET difficulty = 4 WHERE reward_type IN ('wolf_hint');
UPDATE mission_templates SET difficulty = 5 WHERE reward_type IN ('immunity');

-- ============================================
-- VIEW: Player wallet with active powers
-- ============================================

CREATE OR REPLACE VIEW player_wallet AS
SELECT 
  p.id AS player_id,
  p.game_id,
  p.pseudo,
  COALESCE(p.mission_points, 0) AS points,
  (
    SELECT COUNT(*) 
    FROM player_purchases pp 
    WHERE pp.player_id = p.id AND pp.used_at IS NULL
  ) AS unused_powers,
  (
    SELECT json_agg(json_build_object(
      'purchase_id', pp.id,
      'item_name', si.name,
      'effect_type', si.effect_type,
      'icon', si.icon
    ))
    FROM player_purchases pp
    JOIN shop_items si ON pp.shop_item_id = si.id
    WHERE pp.player_id = p.id AND pp.used_at IS NULL
  ) AS active_powers
FROM players p;

-- ============================================
-- COMMENT
-- ============================================

COMMENT ON TABLE shop_items IS 'Available items players can purchase with mission points';
COMMENT ON TABLE player_purchases IS 'Tracks what items players have bought and used';
COMMENT ON COLUMN players.mission_points IS 'Points earned from completing missions, spent in shop';
COMMENT ON COLUMN missions.difficulty IS 'Mission difficulty 1-5 stars, determines point reward';
