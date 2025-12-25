# Moonfall - Loup-Garou Grandeur Nature

> App web pour jouer au Loup-Garou IRL avec missions réelles.

🔗 **Production :** https://moonfall.vercel.app

## Concept

Chaque joueur reçoit un rôle secret. Missions IRL + conseils réguliers avec éliminations par vote.

---

## 📚 Documentation

Docs centralisées dans [`docs/`](../docs/README.md) :

| Document | Contenu |
|----------|---------|
| [STACK.md](../docs/STACK.md) | Stack technique, installation, structure projet |
| [SUPABASE.md](../docs/SUPABASE.md) | Database, Auth, Realtime, Storage, Edge Functions |
| [VERCEL.md](../docs/VERCEL.md) | Déploiement, CI/CD, environnements |
| [PUSH_NOTIFICATIONS.md](../docs/PUSH_NOTIFICATIONS.md) | Web Push, VAPID, Service Worker |
| [ROLES.md](../docs/ROLES.md) | Game design des rôles, pouvoirs, équipes |
| [MISSIONS_DESIGN.md](../docs/MISSIONS_DESIGN.md) | Système de missions IRL, enchères, récompenses |

> **⚠️ Important :** Avant d'implémenter une fonctionnalité, consulter la doc associée. Après un changement significatif (nouveau système, config, rôle...), **mettre à jour la doc correspondante**.

---

## Stack Technique

| Composant | Choix |
|-----------|-------|
| Framework | Next.js 16 (App Router, React 19, React Compiler) |
| Styling | Tailwind CSS 4 |
| Database | Supabase (PostgreSQL, Frankfurt) |
| Auth | Supabase Auth (optionnel - sessions localStorage suffisent) |
| Realtime | Supabase Realtime (postgres_changes) |
| Storage | Supabase Storage (3 buckets) |
| Notifications | Web Push (VAPID keys) + Edge Functions |
| Hébergement | Vercel (CD sur push main) |
| Repo | github.com/magsenche/moonfall |

---

## Architecture Principles (Code Quality)

### 🎯 Maintainability First

Before implementing any new feature, follow these principles:

1. **Search Before Create**
   - Grep the codebase for similar patterns before writing new code
   - Check if existing utilities, hooks, or components can be reused or extended
   - Look for opportunities to extract shared logic into reusable modules

2. **DRY (Don't Repeat Yourself)**
   - If you find yourself copying code, extract it into a shared function/component
   - Common patterns should live in `lib/utils/`, `lib/hooks/`, or `components/ui/`
   - API patterns should be consistent across all routes

3. **Single Responsibility**
   - Each file should do one thing well
   - Large components (>300 lines) should be split into smaller focused components
   - Keep API routes thin: extract business logic into `lib/` modules

4. **Refactor Opportunistically**
   - When touching existing code, improve it if reasonable
   - Remove dead code and unused imports
   - Consolidate duplicate logic discovered during development

5. **State Colocation**
   - Keep state as close as possible to where it's used
   - Avoid prop drilling >2 levels; consider context or composition
   - Reset related states together (see `useEffect` for phase changes)

### 📁 Code Organization

```
lib/
├── api/          # Centralized API client (apiGet/Post/Patch/Delete, typed functions)
├── utils/        # Pure functions (cn, generateCode, player-session)
├── hooks/        # Reusable React hooks
├── supabase/     # DB client, queries, helpers
└── roles/        # Role-specific logic (extensible pattern)

components/
├── ui/           # Generic, reusable (Button, Card, Input)
└── game/         # Domain-specific, composable
```

### ✅ Before Committing

- [ ] No duplicate logic introduced
- [ ] Related code is colocated
- [ ] New patterns are documented if non-obvious
- [ ] Build passes (`npm run build`)

---

## Architecture

### Structure du Projet

```
src/
├── app/                         # Pages (App Router)
│   ├── page.tsx                 # Accueil (créer/rejoindre partie)
│   ├── layout.tsx               # Layout racine + AuthProvider
│   ├── auth/
│   │   └── login/page.tsx       # Login (email → OTP)
│   ├── game/[code]/
│   │   ├── page.tsx             # Page serveur (fetch initial)
│   │   ├── game-client.tsx      # Client principal (orchestrateur)
│   │   ├── hooks/               # Hooks spécialisés (refactorisé 24/12/2025)
│   │   │   ├── types.ts         # Types partagés pour le game
│   │   │   ├── useGameRealtime  # Subscriptions Supabase
│   │   │   ├── usePlayerSession # Session localStorage + recovery
│   │   │   ├── useVoting        # Vote jour
│   │   │   ├── useNightActions  # Vote loups + Voyante
│   │   │   ├── useWolfChat      # Chat loups
│   │   │   ├── useMissions      # Fetch/soumission missions
│   │   │   ├── useGameSettings  # Settings MJ
│   │   │   ├── useTimer         # Countdown phase
│   │   │   └── useAutoGarou     # Auto mode (no MJ) progression
│   │   └── components/          # Composants UI game
│   │       ├── LobbyView        # Écran d'attente
│   │       ├── PlayersList      # Liste joueurs
│   │       ├── PlayerRoleCard   # Carte rôle perso
│   │       ├── VotingPanel      # Vote jour
│   │       ├── WolfNightVote    # Vote nuit loups
│   │       ├── WolfChatPanel    # Chat loups
│   │       ├── SeerPowerPanel   # Pouvoir voyante
│   │       ├── MJControls       # Contrôles MJ
│   │       ├── MJOverview       # Vue d'ensemble MJ
│   │       ├── PhaseTimer       # Timer + badge phase
│   │       └── ...
│   ├── api/mission-templates/    # GET templates globaux (depuis DB)
│   └── api/games/
│       ├── route.ts             # POST (créer partie)
│       └── [code]/
│           ├── route.ts         # GET game
│           ├── join/            # POST rejoindre
│           ├── start/           # POST lancer
│           ├── phase/           # PATCH changer phase
│           ├── vote/            # POST voter
│           ├── power/           # POST utiliser pouvoir
│           ├── wolf-chat/       # GET/POST chat loups
│           ├── missions/        # GET/POST/PATCH missions + [missionId]/bid, submit
│           ├── settings/        # GET/PATCH settings MJ
│           ├── shop/            # GET/POST shop items + [purchaseId]/use
│           └── bots/            # POST/DELETE ajouter/retirer bots (dev)
├── components/
│   ├── ui/                      # Button, Input, Card
│   └── game/                    # PlayerAvatar, RoleBadge, GamePhaseBadge, GameOver, NotificationPrompt, MissionForm, MissionCard
├── config/                      # Thème, rôles, personnalisation joueurs
├── lib/
│   ├── api/                     # Client API centralisé (client.ts, games.ts)
│   ├── auth/                    # AuthProvider, useAuth hook
│   ├── notifications/           # useNotifications, subscribeToPush
│   ├── missions/                # Types missions, labels (templates en DB)
│   ├── supabase/                # Client (browser), Server (SSR), Storage helpers
│   ├── roles/                   # Handlers par rôle (villageois, loup-garou, voyante)
│   └── utils/                   # cn(), generateGameCode(), player-session
└── types/                       # database.ts, supabase.ts (générés), game.ts

supabase/
├── migrations/                  # SQL migrations
└── functions/
    └── push/                    # Edge Function pour Web Push
```

### Base de Données (14 tables)

| Table | Description |
|-------|-------------|
| `roles` | Rôles disponibles (name, team, description, icon, image_url) |
| `powers` | Pouvoirs par rôle (phase, priority, uses_per_game) |
| `games` | Parties (code, status, settings JSON, phase_ends_at, winner) |
| `players` | Joueurs (pseudo, role_id, is_alive, is_mj, mission_points) |
| `missions` | Missions créées par MJ (+ difficulty 1-5) |
| `mission_assignments` | Assignments multi-joueurs (mission_id, player_id, status) |
| `mission_templates` | Templates réutilisables (globaux, 14 prédéfinis) |
| `shop_items` | Items achetables (name, cost, effect_type, limits) |
| `player_purchases` | Achats joueurs (shop_item_id, used_at, result) |
| `votes` | Votes jour/nuit (phase, voter_id, target_id, vote_type) |
| `wolf_chat` | Chat privé des loups-garous |
| `power_uses` | Historique des pouvoirs utilisés |
| `game_events` | Audit log (game_started, phase_change, player_killed...) |
| `push_subscriptions` | Abonnements Web Push (user_id, endpoint, p256dh, auth) |

**Enums :**
- `game_status`: lobby, jour, nuit, conseil, terminee
- `team_type`: village, loups, solo
- `vote_type`: jour, nuit_loup, pouvoir
- `power_phase`: nuit, jour, mort
- `mission_status`: pending, in_progress, success, failed, cancelled
- `shop_effect_type`: immunity, double_vote, wolf_vision, anonymous_vote, mj_question, silence

**Storage Buckets :**
- `role-assets` - Illustrations rôles (5MB, public)
- `player-avatars` - Avatars joueurs (2MB, owner write)
- `game-assets` - Backgrounds, icônes, sons (10MB)

### Principes

1. **Config-driven** : Maximum en DB, pas en dur
2. **Modulaire** : Chaque rôle = handler indépendant
3. **Types générés** : `npm run supabase:types` après chaque migration
4. **Extensible** : Prévu pour custom assets/images

---

## Rôles MVP

| Rôle | Équipe | Pouvoir |
|------|--------|---------|
| Villageois | 🔵 Village | Aucun |
| Loup-Garou | 🔴 Loups | Dévore un villageois chaque nuit |
| Voyante | 🔵 Village | Voit un rôle chaque nuit |

**Futurs rôles préparés :** Sorcière, Chasseur, Cupidon, Salvateur, Petite Fille, Ancien, Loup Blanc, Ange...

---

## État d'Avancement

### ✅ Fait

- [x] Setup projet (Next.js 16, Supabase, Tailwind 4)
- [x] Schéma DB complet avec migrations
- [x] Types TypeScript générés depuis Supabase
- [x] MCP Supabase connecté
- [x] Storage buckets pour assets
- [x] Composants UI (Button, Input, Card)
- [x] Composants game (PlayerAvatar, RoleBadge, GamePhaseBadge)
- [x] Config thème/rôles/joueurs extensible
- [x] Page d'accueil (créer/rejoindre partie)
- [x] API routes (POST/GET games, join, start)
- [x] Lobby avec realtime (liste joueurs)
- [x] Handlers de rôles (Villageois, Loup-Garou, Voyante)
- [x] Lancement de partie (distribution des rôles)
- [x] Vue joueur avec son rôle (carte, équipe, phase)
- [x] RLS policies corrigées (anon access pour prototype)
- [x] Système d'identification joueur (session/localStorage)
- [x] Système de vote jour (élimination publique)
- [x] Conditions de victoire (loups >= villageois / plus de loups)
- [x] Vote nuit des loups
- [x] Chat privé des loups (realtime)
- [x] Pouvoir Voyante (voir un rôle)
- [x] Timer countdown (jour: 5min, conseil: 3min)
- [x] Missions basiques (création MJ, validation)
- [x] Interface MJ (voir rôles, panneau de contrôle, vue d'ensemble)
- [x] Web Push Notifications (Service Worker, permission prompt, phase change alerts)
- [x] Écran de fin de partie festif (message victoire, confettis)
- [x] Missions multi-joueurs (assigner à plusieurs personnes via mission_assignments)
- [x] Settings partie MJ (temps des phases personnalisables via UI)
- [x] Sessions multi-jeux (localStorage par gameCode, migration ancien format)
- [x] Reconnexion simplifiée (rejoin par pseudo via API, sans email auth)
- [x] Homepage avec "Mes parties" (liste sessions stockées)
- [x] iOS PWA : refresh auto au retour foreground (visibilitychange)
- [x] Reset automatique des votes au changement de phase (tous joueurs)
- [x] MJ peut forcer résolution vote loups (même si incomplet)
- [x] Affichage du vote confirmé (pour qui on a voté)
- [x] Compteur votes loups visible par MJ pendant la nuit
- [x] Système de missions avancé (types, catégories, templates, enchères)
- [x] UI MJ : créer mission depuis templates ou libre
- [x] Missions enchères (auction) : joueurs enchérissent, gagnant réalise le défi
- [x] API submission/bid pour missions compétitives
- [x] Système de points missions (difficulté 1-5⭐ = 2-10 pts)
- [x] Shop de pouvoirs (6 pouvoirs : immunité, vote double, vision loup...)
- [x] UI Wallet joueur (points + pouvoirs actifs avec noms/icônes)
- [x] UI Shop (acheter avec points)
- [x] Intégration pouvoirs dans vote (immunité, double_vote auto)
- [x] Filtres missions MJ (En cours / Terminées / Toutes)
- [x] **Mode Auto-Garou** : partie sans MJ dédié (phases auto, MJ peut accélérer)
- [x] **Minimum 3 joueurs** (réduit de 6 à 3)
- [x] **Missions en mode Auto-Garou** : collectives, compétitives, enchères (auto-assignation)
- [x] **Durées de phase personnalisables** : min 30s pour tests rapides
- [x] **Auto-refresh Wallet/Shop** : mise à jour automatique après gain de points
- [x] **Affichage résultats vote** : qui a voté qui (avec anonymat)
- [x] **Vote Anonyme fonctionnel** : votes masqués comme "???"

### 🔄 En Cours

**Nouveaux rôles IRL :**
- [ ] Petite Fille (lecture seule chat loups)
- [ ] Chasseur (emporte quelqu'un à sa mort)
- [ ] Ancien (survit 1x attaque loups)
- [ ] Sorcière (potions vie/mort)
- [ ] Cupidon (amoureux liés)

### ⏳ À Faire - MVP

✅ MVP Complet !

### 📋 Backlog

**Priorité haute (post-MVP) :**
- [ ] Valider notifications push en conditions réelles (test multi-appareils iOS)
- [ ] Tester partie complète avec ~10 joueurs réels
- [ ] Pouvoirs ciblés UI (wolf_vision, silence avec sélection cible)
- [ ] **Mode Loup-Garou Infini** (voir docs/INFINITE_MODE.md)
  - [ ] Respawn des morts avec nouveau rôle
  - [ ] Système de points individuels
  - [ ] Leaderboard temps réel
  - [ ] Conditions de victoire (timer/score/tours)

**Backlog général :**
- [ ] Système Fantôme (morts peuvent aider)
- [ ] PWA offline support
- [ ] Custom assets (images rôles, avatars)

---

## Conventions

- **Langue code** : Anglais
- **Langue UI** : Français
- **Types DB** : snake_case (`is_alive`, `game_id`)
- **Types TS** : camelCase pour les alias (`isAlive`)
- **Commits** : Conventional Commits (feat:, fix:, etc.)
- **Instructions Copilot** : Mettre à jour `.github/copilot-instructions.md` lors de changements significatifs

---

## Commandes Utiles

```bash
npm run dev          # Dev server
npm run build        # Build production
npm run lint         # Linter

# Types Supabase (après modification du schéma DB)
npm run supabase:types
```

---

## Variables d'Environnement

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...

# Web Push (VAPID) - voir docs/PUSH_NOTIFICATIONS.md
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BPxxx...
VAPID_PRIVATE_KEY=xxx...  # Edge Function uniquement
```

---

## Outils MCP Disponibles

### Supabase MCP

Connecté au projet. Utiliser pour :
- `list_tables` - Voir schéma et données
- `execute_sql` - Requêtes SELECT/debug
- `apply_migration` - DDL (CREATE, ALTER)
- `get_advisors` - Sécurité/perf (RLS manquantes)
- `get_logs` - Debug (postgres, auth, edge-function)

> **Note :** Pour régénérer les types TypeScript après une migration, utiliser `npm run supabase:types` (pas MCP).

### Playwright MCP

Browser automation pour tests E2E :
- `browser_navigate` - Aller à une URL
- `browser_snapshot` - Capture accessibilité (meilleur que screenshot)
- `browser_click`, `browser_type` - Interactions
- `browser_fill_form` - Remplir formulaires
- `browser_console_messages` - Debug JS

### Context7

Documentation à jour des librairies :
- `resolve-library-id` - Trouver l'ID (ex: "supabase" → "/supabase/supabase")
- `get-library-docs` - Docs + exemples code (topic="auth", mode="code")
