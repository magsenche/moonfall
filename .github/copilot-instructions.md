# Moonfall - Loup-Garou Grandeur Nature

> App web pour jouer au Loup-Garou IRL avec missions réelles.

🔗 **Production :** https://moonfall.vercel.app

## Concept
Chaque joueur reçoit un rôle secret. Missions IRL + conseils réguliers avec éliminations par vote.

---

## 📚 Documentation

Docs centralisées dans [`docs/`](../docs/README.md) :

> **⚠️ Important :** Avant d'implémenter une fonctionnalité, consulter la doc associée. Après un changement significatif (nouveau système, config, rôle...), **mettre à jour la doc correspondante**.

---

## 🏗️ Architecture & Best Practices

### 📁 Code Organization

```
lib/
├── api/          # Centralized API client (apiGet/Post/Patch/Delete, typed functions)
├── utils/        # Pure functions (cn, generateCode, player-session)
├── hooks/        # Reusable React hooks
├── supabase/     # DB client, queries, helpers
└── roles/        # Role-specific logic (extensible pattern)

components/
├── ui/           # Generic, reusable (Button, Card, Input, MotionCard, MotionButton)
└── game/         # Domain-specific, composable
```

### 🎯 Maintainability Principles

1. **Search Before Create** - Grep codebase for similar patterns before writing new code
2. **DRY** - Extract shared logic into `lib/utils/`, `lib/hooks/`, or `components/ui/`
3. **Single Responsibility** - Each file does one thing well, split large components (>300 lines)
4. **Refactor Opportunistically** - Improve touched code, remove dead code
5. **State Colocation** - Keep state close to where it's used, avoid prop drilling >2 levels

### Core Principles
1. **GameContext** : État global du jeu (`useGame()`). Évite le prop drilling.
2. **TimerContext** : Isolé pour la performance. Seuls `GameHeader` et `GameLogic` se re-rendent chaque seconde.
3. **UI Y2K/Sticker** : Esthétique "scrapbook" avec `framer-motion` (animations, drag, rotate).
4. **Config-driven** : Rôles et paramètres gérés en DB ou via config objects.

### Structure du Projet

```
src/
├── app/
│   ├── game/[code]/
│   │   ├── context/             # GameContext + TimerContext
│   │   ├── components/          # Composants UI (GameLayout, PhaseTimer...)
│   │   └── hooks/               # Logique métier (useVoting, useNightActions...)
├── components/
│   ├── game/                    # Composants métier (RoleCard, MissionCard, MissionsDrawer)
│   └── ui/                      # Composants base (MotionButton, MotionCard)
├── lib/
│   ├── api/                     # Client API centralisé (typed functions)
│   ├── help/                    # Textes d'aide et tips
│   └── roles/                   # Handlers logiques par rôle
```

### Conventions UI (Y2K Style)
- Utiliser `MotionCard` et `MotionButton` (variant `sticker`).
- Animations fluides via `framer-motion` (`AnimatePresence`, `layout`).
- Feedback tactile et visuel fort (bordures épaisses, ombres dures).
- **Mobile First** : Touch targets > 44px, modales bottom-sheet.


### ✅ Before Committing

- [ ] No duplicate logic introduced
- [ ] Related code is colocated
- [ ] New patterns are documented if non-obvious
- [ ] Build passes (`npm run build`)

---

## Stack Technique

| Composant | Choix |
|-----------|-------|
| Framework | Next.js 16 (App Router, React 19, React Compiler) |
| Styling | Tailwind CSS 4 |
| Animation | Framer Motion |
| Database | Supabase (PostgreSQL, Frankfurt) |
| Auth | Supabase Auth (optionnel - sessions localStorage suffisent) |
| Realtime | Supabase Realtime (postgres_changes) |
| Storage | Supabase Storage (3 buckets) |
| Notifications | Web Push (VAPID keys) + Edge Functions |
| Hébergement | Vercel (CD sur push main) |
| Repo | github.com/magsenche/moonfall |

---

## ❌ Anti-patterns à éviter

### Code
- ❌ Ne PAS hardcoder des IDs de rôles/joueurs → utiliser les requêtes DB
- ❌ Ne PAS dupliquer la logique métier entre API routes → extraire dans `lib/`
- ❌ Ne PAS utiliser `any` en TypeScript → typer avec `src/types/`
- ❌ Ne PAS créer de nouveaux composants UI génériques → réutiliser `components/ui/`
- ❌ Ne PAS faire de prop drilling >2 niveaux → utiliser context ou composition
- ❌ Ne PAS consommer `useTimerContext` dans des composants inutiles → provoque re-render 1/sec

### UI / UX
- ❌ Ne PAS mettre du texte anglais dans l'UI → tout en **français**
- ❌ Ne PAS utiliser des boutons <44px sur mobile → respecter touch targets
- ❌ Ne PAS oublier les états loading/error → toujours les gérer

### Supabase
- ❌ Ne PAS utiliser `execute_sql` pour DDL → utiliser `apply_migration`
- ❌ Ne PAS oublier `npm run supabase:types` après une migration
- ❌ Ne PAS requêter sans filtrer par `game_id` → risque de data leak

### Patterns existants à réutiliser
- **GameContext** : `app/game/[code]/context/GameContext.tsx` → `useGame()` hook pour accéder à tout l'état du jeu
- **TimerContext** : Isolé pour éviter les re-renders inutiles
- API client : `lib/api/client.ts` (apiGet, apiPost, apiPatch, apiDelete)
- Sessions joueur : `lib/utils/player-session.ts`
- Hooks game : `app/game/[code]/hooks/` (useVoting, useTimer, etc.)
- Aide/Help : `lib/help/` (role-details, phase-descriptions, tips)

---

## 🛠️ Instructions Spécifiques

- **Modification de Phase** : Toujours utiliser l'API `/api/games/[code]/phase` ou les fonctions de résolution (`resolveVote`).
- **Nouveaux Rôles** : Ajouter entrée dans `roles` DB + Handler `lib/roles/` + Config `config/roles.ts`.
- **Performance** : Ne pas consommer `useTimerContext` dans des composants qui n'en ont pas besoin.


---

## Conventions

- **Langue code** : Anglais
- **Langue UI** : Français
- **Types DB** : snake_case (`is_alive`, `game_id`)
- **Types TS** : camelCase pour les alias (`isAlive`)
- **Commits** : Conventional Commits (feat:, fix:, etc.)
- **Instructions Copilot** : Mettre à jour `.github/copilot-instructions.md` lors de changements significatifs

---

## ✅ État d'Avancement

### Fonctionnalités principales
- **Jeu complet** : Lobby → Jour → Conseil → Nuit → Victoire (Timer & Auto-switch).
- **Mode Auto-Garou** : Le MJ joue aussi, phases automatiques, résolution auto des votes.
- **Mode Démo** : Création instantanée avec bots et missions d'entraînement.
- **Missions & Shop** : Système de points, shop de pouvoirs (Immunité, Vision, etc.), Templates en DB.
- **Realtime** : Synchronisation instantanée (Votes, Chat Loups, Missions).
- **UI** : Design Y2K complet, MissionsDrawer flottant, Galerie de rôles.
- **PWA** : notifications push, refresh iOS, sessions multi-jeux.
- **Aide in-game** : modales rôles, tooltips phases, règles, tips contextuels.

→ Détails : voir `docs/` (ROLES.md, MISSIONS_DESIGN.md, HELP_SYSTEM.md, etc.)

### Rôles Implémentés
| Rôle | Status | Particularité |
|------|--------|---------------|
| Villageois | ✅ | Vote simple |
| Loup-Garou | ✅ | Chat privé + Vote nuit |
| Voyante | ✅ | Historique des visions + Panel nuit |
| Petite Fille | ✅ | Chat loups en lecture seule (pseudos anonymes) |
| Sorcière | ✅ | Potions Vie/Mort (Panel nuit) |
| Chasseur | ✅ | Tir mortel à la mort (Modal) |
| Ancien | ✅ | Survit 1x aux loups (Passif) |

### ⏳ À Faire

**Nouveaux rôles :**
- [ ] Salvateur (protège un joueur la nuit)
- [ ] Cupidon (amoureux liés - complexe)

### 📋 Backlog

**Priorité haute :**
- [ ] Valider notifications push en conditions réelles (test multi-appareils iOS)
- [ ] Tester partie complète avec ~10 joueurs réels
- [ ] Pouvoirs ciblés UI (wolf_vision, silence avec sélection cible)
- [ ] **Mode Loup-Garou Infini** (voir docs/INFINITE_MODE.md)
  - [ ] Respawn des morts avec nouveau rôle
  - [ ] Système de points individuels
  - [ ] Leaderboard temps réel
  - [ ] Conditions de victoire (timer/score/tours)

**Backlog général :**
- [ ] PWA offline support
- [ ] Custom assets (images rôles, avatars)

---

## Architecture détaillée

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
│   │   ├── game-client.tsx      # Wrapper léger (~30 lignes)
│   │   ├── context/             # 🆕 React Context (refactorisé 26/12/2025)
│   │   │   └── GameContext.tsx  # GameProvider + useGame() hook (~580 lignes)
│   │   ├── hooks/               # Hooks spécialisés
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
│   │   └── components/          # Composants UI game (tous utilisent useGame())
│   │       ├── GameLayout       # 🆕 Orchestrateur UI principal
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
