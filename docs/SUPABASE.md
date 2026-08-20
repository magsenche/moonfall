# 🗄️ Supabase

> Backend-as-a-Service : PostgreSQL, Auth, Realtime, Storage, Edge Functions.

## Configuration

**Projet:** Moonfall (région Frankfurt)

**Dashboard:** https://supabase.com/dashboard

### Variables d'environnement

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
```

---

## Database (PostgreSQL)

### Tables principales

| Table | Description |
|-------|-------------|
| `games` | Parties (code, status, settings, phase_ends_at, winner) |
| `players` | Joueurs (pseudo, role_id, is_alive, is_mj, mission_points) |
| `roles` | Rôles disponibles (name, team, description, icon) |
| `powers` | Pouvoirs par rôle (phase, priority, uses_per_game) |
| `missions` | Missions IRL (type, category, difficulty, auction_data) |
| `mission_assignments` | Participation joueurs aux missions |
| `mission_templates` | Templates de missions réutilisables (globaux) |
| `shop_items` | Items achetables (name, cost, effect_type, limits) |
| `player_purchases` | Achats joueurs (shop_item_id, used_at, result) |
| `votes` | Votes jour/nuit ; `vote_type: pouvoir` porte aussi les intuitions de nuit (phase >= 1) et le procès d'avant-partie au lobby (phase 0) |
| `wolf_chat` | Chat privé des loups |
| `power_uses` | Historique pouvoirs utilisés |
| `game_events` | Audit log (triggers les notifications push) |
| `push_subscriptions` | Abonnements Web Push |
| `phase_ready` | « Prêt » collectif par (game, phase, status) — migration 007 : l'unanimité des humains vivants ramène `phase_ends_at` à ~3s (skip de phase Auto-Garou) |

> Tables annexes de rôles : `lovers` (Cupidon), `wild_child_models`
> (Enfant Sauvage), `salvateur_protections` (Salvateur).

### Enums

```sql
game_status: lobby, jour, nuit, conseil, terminee
team_type: village, loups, solo
vote_type: jour, nuit_loup, pouvoir
mission_type: individual, collective, competitive, auction
mission_category: social, challenge, quiz, external, photo, auction
mission_validation_type: mj, auto, upload, external, first_wins, best_score
reward_type: wolf_hint, immunity, double_vote, extra_vision, silence, none
```

### Migrations

```bash
# Appliquer les migrations (via Supabase CLI)
supabase db push

# Ou via MCP Supabase dans l'éditeur
# → apply_migration
```

Les migrations sont dans `supabase/migrations/`.

### Générer les types TypeScript

```bash
# Script npm (recommandé)
npm run supabase:types

# Génère src/types/supabase.ts depuis le projet distant
```

---

## Realtime

Utilisé pour synchroniser l'état du jeu entre les joueurs.

### Canaux utilisés

```typescript
// Dans lobby-client.tsx
supabase
  .channel(`game:${gameCode}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'players',
    filter: `game_id=eq.${gameId}`
  }, handlePlayerChange)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'games',
    filter: `id=eq.${gameId}`
  }, handleGameChange)
  .subscribe()
```

### Tables avec Realtime activé

- `games` - Changements de phase, status
- `players` - Joueurs rejoignent/quittent, morts
- `votes` - Votes en temps réel
- `wolf_chat` - Messages loups
- `missions` - Créations/updates missions
- `mission_assignments` - Soumissions joueurs

---

## Storage

### Buckets

| Bucket | Usage | Taille max | Accès |
|--------|-------|------------|-------|
| `role-assets` | Illustrations rôles | 5MB | Public |
| `player-avatars` | Avatars joueurs | 2MB | Owner write |
| `game-assets` | Backgrounds, icônes, sons | 10MB | Public |

### Utilisation

```typescript
import { uploadFile, getPublicUrl } from '@/lib/supabase/storage'

// Upload
const path = await uploadFile('player-avatars', file, `${odataId}/${filename}`)

// URL publique
const url = getPublicUrl('role-assets', 'loup-garou.png')
```

---

## Edge Functions

### push (Notifications)

Envoie des notifications Web Push quand un `game_event` est inséré.

```bash
# Déployer
supabase functions deploy push --no-verify-jwt

# Logs
supabase functions logs push
```

**Secrets requis:**
```bash
supabase secrets set VAPID_PUBLIC_KEY=xxx
supabase secrets set VAPID_PRIVATE_KEY=xxx
supabase secrets set VAPID_SUBJECT=mailto:hello@moonfall.app
```

**Webhook configuré:** `game_events` → INSERT → Edge Function `push`

---

## Fichiers clés

| Fichier | Description |
|---------|-------------|
| `src/lib/supabase/client.ts` | Client browser |
| `src/lib/supabase/server.ts` | Client SSR |
| `src/lib/supabase/storage.ts` | Helpers storage |
| `src/types/supabase.ts` | Types générés |
| `supabase/migrations/` | Migrations SQL |
| `supabase/functions/push/` | Edge Function push |

---

## Commandes MCP utiles

```
list_tables          # Voir schéma
execute_sql          # Requêtes SELECT
apply_migration      # DDL (CREATE, ALTER)
generate_typescript_types  # Régénérer types
get_advisors         # Sécurité/perf
get_logs             # Debug
```

---

## Scheduled Jobs (pg_cron)

### cleanup-old-games

Nettoie automatiquement les vieilles parties pour éviter le bloat de la DB.

**Schedule:** `0 3 * * *` (tous les jours à 3h UTC)

**Actions:**
- Supprime les parties `terminee` de plus de 7 jours
- Supprime les parties `lobby` abandonnées (pas d'activité depuis 24h)

**Fonction:** `public.cleanup_old_games()`

```sql
-- Vérifier le job
SELECT jobname, schedule, active FROM cron.job;

-- Voir l'historique d'exécution
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC LIMIT 10;

-- Exécuter manuellement
SELECT public.cleanup_old_games();
```

---

## Optimisations appliquées

### Indexes (migration 005)

- 18 indexes sur les foreign keys (players, votes, wolf_chat, etc.)
- 4 indexes composites pour les requêtes fréquentes
- Index partiel sur `players(game_id) WHERE is_alive = true`

### RLS Policies

- Optimisées avec `(SELECT auth.uid())` pour éviter la ré-évaluation
- Policies dupliquées supprimées

---

## À faire

- [ ] Backup automatique off-site
- [ ] Monitoring performances (pg_stat_statements)

---

*Voir aussi: [PUSH_NOTIFICATIONS.md](./PUSH_NOTIFICATIONS.md)*
