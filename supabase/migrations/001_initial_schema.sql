-- ============================================
-- MOONFALL - Initial Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE team_type AS ENUM ('village', 'loups', 'solo');
CREATE TYPE game_status AS ENUM ('lobby', 'jour', 'nuit', 'conseil', 'terminee');
CREATE TYPE power_phase AS ENUM ('nuit', 'jour', 'mort');
CREATE TYPE vote_type AS ENUM ('jour', 'nuit_loup', 'pouvoir');
CREATE TYPE mission_status AS ENUM ('pending', 'in_progress', 'success', 'failed', 'cancelled');

-- ============================================
-- ROLES (Global configuration - not per game)
-- ============================================

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  team team_type NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(10), -- Emoji
  image_url TEXT, -- URL to role icon/avatar image in storage
  card_image_url TEXT, -- URL to full role card illustration in storage
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- POWERS (Linked to roles)
-- ============================================

CREATE TABLE powers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  phase power_phase NOT NULL,
  uses_per_game INTEGER, -- NULL = unlimited
  priority INTEGER NOT NULL DEFAULT 0, -- Execution order (lower = first)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_powers_role_id ON powers(role_id);

-- ============================================
-- GAMES (Parties)
-- ============================================

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(6) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  status game_status DEFAULT 'lobby',
  current_phase INTEGER DEFAULT 0,
  phase_ends_at TIMESTAMPTZ, -- Timestamp when the current phase ends (for timer display)
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  winner team_type
);

CREATE INDEX idx_games_code ON games(code);
CREATE INDEX idx_games_status ON games(status);

-- ============================================
-- PLAYERS (Players in a game)
-- ============================================

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id), -- Can be NULL for anonymous players
  pseudo VARCHAR(50) NOT NULL,
  role_id UUID REFERENCES roles(id),
  is_alive BOOLEAN DEFAULT true,
  is_mj BOOLEAN DEFAULT false,
  death_reason VARCHAR(100),
  death_at TIMESTAMPTZ,
  avatar_url TEXT, -- URL to custom avatar image in storage
  color TEXT, -- Player chosen color for UI
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(game_id, pseudo) -- Unique pseudo per game
);

CREATE INDEX idx_players_game_id ON players(game_id);
CREATE INDEX idx_players_user_id ON players(user_id);
CREATE INDEX idx_players_role_id ON players(role_id);

-- ============================================
-- MISSIONS
-- ============================================

CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'photo', 'defi', 'enigme', 'social'
  status mission_status DEFAULT 'pending',
  assigned_to UUID REFERENCES players(id), -- NULL = collective mission
  deadline TIMESTAMPTZ,
  reward_description TEXT, -- What happens on success
  penalty_description TEXT, -- What happens on failure
  validated_by UUID REFERENCES players(id),
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_missions_game_id ON missions(game_id);
CREATE INDEX idx_missions_assigned_to ON missions(assigned_to);
CREATE INDEX idx_missions_status ON missions(status);

-- ============================================
-- VOTES
-- ============================================

CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  phase INTEGER NOT NULL,
  voter_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  target_id UUID REFERENCES players(id) ON DELETE SET NULL, -- NULL = abstention
  vote_type vote_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One vote per player per phase per type
  UNIQUE(game_id, phase, voter_id, vote_type)
);

CREATE INDEX idx_votes_game_id ON votes(game_id);
CREATE INDEX idx_votes_phase ON votes(game_id, phase);

-- ============================================
-- WOLF CHAT
-- ============================================

CREATE TABLE wolf_chat (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wolf_chat_game_id ON wolf_chat(game_id);
CREATE INDEX idx_wolf_chat_created_at ON wolf_chat(created_at);

-- ============================================
-- POWER USES (Track when powers are used)
-- ============================================

CREATE TABLE power_uses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  power_id UUID NOT NULL REFERENCES powers(id) ON DELETE CASCADE,
  target_id UUID REFERENCES players(id) ON DELETE SET NULL,
  phase INTEGER NOT NULL,
  result JSONB, -- Store the result (e.g., role revealed for Voyante)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_power_uses_game_id ON power_uses(game_id);
CREATE INDEX idx_power_uses_player_id ON power_uses(player_id);

-- ============================================
-- GAME EVENTS (Audit log)
-- ============================================

CREATE TABLE game_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  actor_id UUID REFERENCES players(id) ON DELETE SET NULL,
  target_id UUID REFERENCES players(id) ON DELETE SET NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_game_events_game_id ON game_events(game_id);
CREATE INDEX idx_game_events_type ON game_events(event_type);
CREATE INDEX idx_game_events_created_at ON game_events(created_at);

-- ============================================
-- SEED DATA: Default Roles
-- ============================================

INSERT INTO roles (name, display_name, team, description, icon) VALUES
  ('villageois', 'Villageois', 'village', 'Un simple villageois. Votre seul pouvoir est votre vote et votre sens de l''observation.', '👨‍🌾'),
  ('loup_garou', 'Loup-Garou', 'loups', 'Chaque nuit, vous vous réunissez avec les autres loups pour dévorer un villageois.', '🐺'),
  ('voyante', 'Voyante', 'village', 'Chaque nuit, vous pouvez découvrir le rôle d''un joueur de votre choix.', '🔮');

-- ============================================
-- SEED DATA: Powers for each role
-- ============================================

-- Loup-Garou: Dévorer (night, unlimited, priority 50)
INSERT INTO powers (role_id, name, description, phase, uses_per_game, priority)
SELECT id, 'devorer', 'Voter pour éliminer un villageois cette nuit', 'nuit', NULL, 50
FROM roles WHERE name = 'loup_garou';

-- Voyante: Voir un rôle (night, unlimited, priority 20)
INSERT INTO powers (role_id, name, description, phase, uses_per_game, priority)
SELECT id, 'voir_role', 'Découvrir le rôle d''un joueur', 'nuit', NULL, 20
FROM roles WHERE name = 'voyante';

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE powers ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolf_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE power_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Roles: Everyone can read active roles
CREATE POLICY "Roles are viewable by everyone" ON roles
  FOR SELECT USING (is_active = true);

-- Powers: Everyone can read powers
CREATE POLICY "Powers are viewable by everyone" ON powers
  FOR SELECT USING (true);

-- Games: Players can view games they're in
CREATE POLICY "Games are viewable by participants" ON games
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.game_id = games.id 
      AND players.user_id = auth.uid()
    )
    OR status = 'lobby' -- Lobby games are public
  );

-- Games: Authenticated users can create games
CREATE POLICY "Authenticated users can create games" ON games
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Games: MJ can update their games
CREATE POLICY "MJ can update their games" ON games
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.game_id = games.id 
      AND players.user_id = auth.uid()
      AND players.is_mj = true
    )
  );

-- Players: Players can view other players in their game
CREATE POLICY "Players can view players in their game" ON players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players AS p 
      WHERE p.game_id = players.game_id 
      AND p.user_id = auth.uid()
    )
  );

-- Players: Authenticated users can join games
CREATE POLICY "Authenticated users can join games" ON players
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Players: Players can update their own record
CREATE POLICY "Players can update themselves" ON players
  FOR UPDATE USING (user_id = auth.uid());

-- Missions: Players can view missions in their game
CREATE POLICY "Players can view missions in their game" ON missions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.game_id = missions.game_id 
      AND players.user_id = auth.uid()
    )
  );

-- Missions: MJ can manage missions
CREATE POLICY "MJ can manage missions" ON missions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.game_id = missions.game_id 
      AND players.user_id = auth.uid()
      AND players.is_mj = true
    )
  );

-- Votes: Players can view votes after the phase ends (or their own)
CREATE POLICY "Players can view their own votes" ON votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.id = votes.voter_id 
      AND players.user_id = auth.uid()
    )
  );

-- Votes: Players can cast votes
CREATE POLICY "Players can cast votes" ON votes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.id = voter_id 
      AND players.user_id = auth.uid()
      AND players.is_alive = true
    )
  );

-- Wolf chat: Only wolves can see wolf chat
CREATE POLICY "Wolves can view wolf chat" ON wolf_chat
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players 
      JOIN roles ON players.role_id = roles.id
      WHERE players.game_id = wolf_chat.game_id 
      AND players.user_id = auth.uid()
      AND roles.team = 'loups'
    )
  );

-- Wolf chat: Wolves can send messages
CREATE POLICY "Wolves can send messages" ON wolf_chat
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM players 
      JOIN roles ON players.role_id = roles.id
      WHERE players.id = player_id 
      AND players.user_id = auth.uid()
      AND roles.team = 'loups'
    )
  );

-- Power uses: Players can see their own power uses
CREATE POLICY "Players can view their power uses" ON power_uses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.id = power_uses.player_id 
      AND players.user_id = auth.uid()
    )
  );

-- Power uses: Players can use their powers
CREATE POLICY "Players can use powers" ON power_uses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.id = player_id 
      AND players.user_id = auth.uid()
      AND players.is_alive = true
    )
  );

-- Game events: Players can view events in their game
CREATE POLICY "Players can view game events" ON game_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.game_id = game_events.game_id 
      AND players.user_id = auth.uid()
    )
  );

-- ============================================
-- REALTIME: Enable realtime for key tables
-- ============================================

-- Note: Run this in Supabase Dashboard > Database > Replication
-- Or use: ALTER PUBLICATION supabase_realtime ADD TABLE games, players, missions, votes, wolf_chat, game_events;

-- ============================================
-- PROTOTYPE MODE: Anonymous Access Policies
-- These policies allow anonymous users to access the app without authentication.
-- Remove these in production and use the authenticated policies above.
-- ============================================

-- Roles: Allow anon to read roles
CREATE POLICY "Allow anon read roles" ON roles
  FOR SELECT TO anon USING (true);

-- Powers: Allow anon to read powers
CREATE POLICY "Allow anon read powers" ON powers
  FOR SELECT TO anon USING (true);

-- Games: Allow anon full access for prototype
CREATE POLICY "Allow anon read games" ON games
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert games" ON games
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update games" ON games
  FOR UPDATE TO anon USING (true);

-- Players: Allow anon full access for prototype
CREATE POLICY "Allow anon read players" ON players
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert players" ON players
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update players" ON players
  FOR UPDATE TO anon USING (true);

-- Missions: Allow anon full access for prototype
CREATE POLICY "Allow anon read missions" ON missions
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert missions" ON missions
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update missions" ON missions
  FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow anon delete missions" ON missions
  FOR DELETE TO anon USING (true);

-- Votes: Allow anon full access for prototype
CREATE POLICY "Allow anon read votes" ON votes
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert votes" ON votes
  FOR INSERT TO anon WITH CHECK (true);

-- Wolf chat: Allow anon full access for prototype
CREATE POLICY "Allow anon read wolf_chat" ON wolf_chat
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert wolf_chat" ON wolf_chat
  FOR INSERT TO anon WITH CHECK (true);

-- Power uses: Allow anon full access for prototype
CREATE POLICY "Allow anon read power_uses" ON power_uses
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert power_uses" ON power_uses
  FOR INSERT TO anon WITH CHECK (true);

-- Game events: Allow anon full access for prototype
CREATE POLICY "Allow anon read game_events" ON game_events
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert game_events" ON game_events
  FOR INSERT TO anon WITH CHECK (true);
