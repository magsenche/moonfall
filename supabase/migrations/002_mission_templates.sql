-- Migration: Add mission_templates table
-- Move templates from code to database for easier management

-- Create mission_templates table
CREATE TABLE IF NOT EXISTS mission_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Classification
  mission_type mission_type NOT NULL DEFAULT 'individual',
  category mission_category NOT NULL DEFAULT 'challenge',
  validation_type mission_validation_type NOT NULL DEFAULT 'mj',
  
  -- Optional settings
  time_limit_seconds INTEGER,
  reward_type reward_type DEFAULT 'none',
  reward_description TEXT,
  penalty_description TEXT,
  external_url TEXT,
  sabotage_allowed BOOLEAN DEFAULT FALSE,
  
  -- Ownership
  is_global BOOLEAN DEFAULT TRUE, -- System templates visible to all
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- For personal templates
  
  -- Metadata
  sort_order INTEGER DEFAULT 0, -- For ordering within category
  is_active BOOLEAN DEFAULT TRUE, -- Soft delete
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast template queries
CREATE INDEX idx_mission_templates_category ON mission_templates(category) WHERE is_active = TRUE;
CREATE INDEX idx_mission_templates_global ON mission_templates(is_global) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE mission_templates ENABLE ROW LEVEL SECURITY;

-- Policies: anyone can read global templates
CREATE POLICY "Anyone can view global templates"
  ON mission_templates FOR SELECT
  USING (is_global = TRUE AND is_active = TRUE);

-- Authenticated users can view their own templates
CREATE POLICY "Users can view own templates"
  ON mission_templates FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid() AND is_active = TRUE);

-- Authenticated users can create personal templates
CREATE POLICY "Users can create personal templates"
  ON mission_templates FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid() AND is_global = FALSE);

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON mission_templates FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Anon can read global templates (for MJ without auth)
CREATE POLICY "Anon can view global templates"
  ON mission_templates FOR SELECT
  TO anon
  USING (is_global = TRUE AND is_active = TRUE);

-- Seed with default templates
INSERT INTO mission_templates (title, description, mission_type, category, validation_type, time_limit_seconds, reward_type, reward_description, sabotage_allowed, sort_order) VALUES
-- Social
('Compliment sincère', 'Faites un compliment sincère à 3 joueurs différents pendant la phase jour.', 'individual', 'social', 'mj', 300, 'none', 'Respect du village +10', FALSE, 1),
('Allié improbable', 'Passez 5 minutes à discuter avec un joueur avec qui vous n''avez pas encore parlé.', 'individual', 'social', 'mj', NULL, 'wolf_hint', 'Indice sur l''équipe d''un joueur', FALSE, 2),

-- Challenge
('Imitation', 'Imitez un animal choisi par le MJ pendant 30 secondes.', 'individual', 'challenge', 'mj', 60, 'none', NULL, FALSE, 1),
('Chant du village', 'Chantez une chanson en y incluant le mot "loup".', 'individual', 'challenge', 'mj', NULL, 'immunity', 'Protection au prochain vote', TRUE, 2),
('Danse du loup', 'Dansez pendant 20 secondes sur une musique choisie par le MJ.', 'individual', 'challenge', 'mj', 60, 'none', NULL, FALSE, 3),

-- Quiz
('Culture générale', 'Répondez correctement à 3 questions du MJ.', 'competitive', 'quiz', 'first_wins', NULL, 'double_vote', 'Vote double au prochain conseil', FALSE, 1),
('Devine qui', 'Devinez le rôle d''un joueur désigné par le MJ.', 'competitive', 'quiz', 'mj', 120, 'wolf_hint', 'Confirmation si votre guess était correct', FALSE, 2),

-- Auction
('Capitales du monde', 'Citez des capitales du monde sans répétition ni erreur. Enchérissez sur le nombre que vous pensez pouvoir citer !', 'auction', 'auction', 'best_score', NULL, 'extra_vision', 'La voyante peut voir 2 rôles cette nuit', FALSE, 1),
('Pompes', 'Faites des pompes ! Enchérissez sur le nombre que vous pouvez faire.', 'auction', 'auction', 'best_score', NULL, 'immunity', 'Immunité au prochain vote', FALSE, 2),
('Apnée', 'Retenez votre respiration ! Enchérissez sur le temps en secondes.', 'auction', 'auction', 'best_score', NULL, 'wolf_hint', 'Savoir si un joueur est loup ou villageois', FALSE, 3),
('Équilibre', 'Tenez en équilibre sur un pied ! Enchérissez sur le temps en secondes.', 'auction', 'auction', 'best_score', NULL, 'none', NULL, FALSE, 4),

-- External
('Mini-jeu externe', 'Jouez au mini-jeu et obtenez le meilleur score !', 'competitive', 'external', 'external', NULL, 'double_vote', 'Vote double au prochain conseil', FALSE, 1),

-- Photo
('Selfie de groupe', 'Prenez un selfie avec au moins 3 autres joueurs en faisant une pose ridicule.', 'collective', 'photo', 'mj', 180, 'none', NULL, FALSE, 1),
('Photo mystère', 'Prenez une photo qui représente votre rôle sans le révéler directement.', 'individual', 'photo', 'mj', 300, 'none', NULL, FALSE, 2);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_mission_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mission_templates_updated_at
  BEFORE UPDATE ON mission_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_mission_templates_updated_at();

-- Comment
COMMENT ON TABLE mission_templates IS 'Reusable mission templates for MJ to quickly create missions';
