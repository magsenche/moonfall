# Moonfall - Loup-Garou Grandeur Nature

> App web pour jouer au Loup-Garou IRL, inspirée de l'émission Fary x Panayotis (Canal+).

## Concept

Chaque joueur reçoit un rôle secret. Missions IRL + conseils réguliers avec éliminations par vote.

---

## Stack Technique

| Composant | Choix |
|-----------|-------|
| Framework | Next.js 16 (App Router, React 19, React Compiler) |
| Styling | Tailwind CSS 4 |
| Database | Supabase (PostgreSQL, Frankfurt) |
| Auth | Supabase Auth (code partie + pseudo) |
| Realtime | Supabase Realtime |
| Storage | Supabase Storage (3 buckets: role-assets, player-avatars, game-assets) |
| Hébergement | Vercel |
| Notifications | À définir (Web Push / Email) |

---

## Architecture

### Structure du Projet

```
src/
├── app/                    # Pages (App Router)
│   ├── page.tsx           # Accueil (créer/rejoindre)
│   ├── game/[code]/       # Page de jeu
│   └── api/games/         # API Routes
├── components/
│   ├── ui/                # Button, Input, Card
│   └── game/              # PlayerAvatar, RoleBadge, GamePhaseBadge
├── config/                # Thème, rôles, personnalisation joueurs
├── lib/
│   ├── supabase/          # Client, server, storage helpers
│   ├── roles/             # Handlers par rôle (modulaire)
│   └── utils/
└── types/                 # Types Supabase générés + helpers
```

### Base de Données

**Tables principales :**
- `roles` - Config des rôles (name, team, description, image_url, card_image_url)
- `powers` - Pouvoirs par rôle (phase, priority, uses_per_game)
- `games` - Parties (code, status, settings JSON)
- `players` - Joueurs (pseudo, role_id, is_alive, is_mj, avatar_url, color)
- `missions` - Missions (title, type, status, assigned_to)
- `votes` - Votes (phase, voter_id, target_id, vote_type)
- `wolf_chat` - Chat privé des loups
- `power_uses` - Historique pouvoirs utilisés
- `game_events` - Audit log

**Storage Buckets :**
- `role-assets` - Illustrations rôles (5MB, public)
- `player-avatars` - Avatars joueurs (2MB, owner write)
- `game-assets` - Backgrounds, icônes, sons (10MB)

### Principes

1. **Config-driven** : Maximum en DB, pas en dur
2. **Modulaire** : Chaque rôle = handler indépendant
3. **Types générés** : `npm run supabase:types` ou MCP
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
- [x] API routes (POST/GET games, join)
- [x] Lobby avec realtime (liste joueurs)
- [x] Handlers de rôles (Villageois, Loup-Garou, Voyante)

### 🔄 En Cours

- [ ] Lancement de partie (distribution des rôles)
- [ ] Vue joueur avec son rôle

### ⏳ À Faire - MVP

- [ ] Système de vote jour (élimination publique)
- [ ] Vote nuit des loups
- [ ] Chat privé des loups (realtime)
- [ ] Pouvoir Voyante (voir un rôle)
- [ ] Timer avant prochain conseil
- [ ] Missions basiques (création MJ, validation)
- [ ] Interface MJ (voir rôles, gérer partie)
- [ ] Notifications (Email + Web Push)
- [ ] Conditions de victoire

### 📋 Backlog

- [ ] Rôles avancés (Sorcière, Chasseur, Cupidon...)
- [ ] Missions avancées (templates, types variés)
- [ ] Système Fantôme (morts peuvent aider)
- [ ] Scoring et classement
- [ ] PWA complète
- [ ] Custom assets (images rôles, avatars)

---

## Conventions

- **Langue code** : Anglais
- **Langue UI** : Français
- **Types DB** : snake_case (`is_alive`, `game_id`)
- **Types TS** : camelCase pour les alias (`isAlive`)
- **Commits** : Conventional Commits (feat:, fix:, etc.)

---

## Commandes Utiles

```bash
npm run dev          # Dev server
npm run build        # Build production
npm run lint         # Linter

# Types Supabase (via MCP ou CLI)
# Les types sont dans src/types/supabase.ts
```

---

## Variables d'Environnement

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
```
