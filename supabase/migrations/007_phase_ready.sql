-- ============================================
-- Migration 007: Phase ready (skip collectif)
-- ============================================
-- « Prêt » par joueur et par phase : quand tous les humains vivants d'une
-- partie Auto-Garou sont prêts, l'API ramène phase_ends_at à maintenant et
-- la machinerie d'auto-résolution existante fait avancer la partie.
-- L'état est indexé par (partie, numéro de phase, statut) : il se remet à
-- zéro naturellement à chaque transition. Se dé-prêter = DELETE.

CREATE TABLE IF NOT EXISTS phase_ready (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  phase INTEGER NOT NULL,
  status game_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (game_id, player_id, phase, status)
);

CREATE INDEX IF NOT EXISTS idx_phase_ready_game_phase
  ON phase_ready(game_id, phase, status);

ALTER TABLE phase_ready ENABLE ROW LEVEL SECURITY;

-- PROTOTYPE MODE: politiques anonymes alignées sur les autres tables de jeu
CREATE POLICY "Allow anon read phase_ready" ON phase_ready
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert phase_ready" ON phase_ready
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon delete phase_ready" ON phase_ready
  FOR DELETE TO anon USING (true);
