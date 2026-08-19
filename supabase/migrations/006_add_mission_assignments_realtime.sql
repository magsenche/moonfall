-- La table mission_assignments manquait dans la publication Realtime
-- alors que l'app s'y abonne (useMissions.ts) : les soumissions de missions
-- n'étaient pas synchronisées en temps réel.
alter publication supabase_realtime add table public.mission_assignments;
