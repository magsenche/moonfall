# 🛠️ Stack Technique

> Vue d'ensemble de la stack et guide d'installation.

## Stack

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework | Next.js (App Router) | 16.x |
| React | React + React Compiler | 19.x |
| Styling | Tailwind CSS | 4.x |
| Database | Supabase (PostgreSQL) | - |
| Auth | Supabase Auth (optionnel) | - |
| Realtime | Supabase Realtime | - |
| Storage | Supabase Storage | - |
| Notifications | Web Push (VAPID) | - |
| Hébergement | Vercel | - |
| Package Manager | npm | - |

## Installation

```bash
# Cloner le repo
git clone https://github.com/magsenche/moonfall.git
cd moonfall

# Installer les dépendances
npm install

# Copier les variables d'environnement
cp .env.example .env.local
# Remplir les valeurs (voir SUPABASE.md et VERCEL.md)

# Lancer en dev
npm run dev
```

## Variables d'environnement

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...

# Web Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BPxxx...
```

## Structure du projet

```
src/
├── app/                    # Pages (App Router)
│   ├── page.tsx           # Accueil
│   ├── layout.tsx         # Layout racine
│   ├── api/               # API Routes
│   │   └── games/         # Endpoints jeu
│   ├── auth/              # Pages auth
│   └── game/[code]/       # Page partie
│       ├── page.tsx       # Server component
│       ├── game-client.tsx # Orchestrateur client
│       ├── hooks/         # Custom hooks (useVoting, useTimer, etc.)
│       └── components/    # Composants UI spécifiques au jeu
├── components/
│   ├── ui/                # Composants génériques (Button, Card, Input)
│   └── game/              # Composants métier (PlayerAvatar, MissionCard...)
├── config/                # Configuration (thème, rôles, joueurs)
├── lib/
│   ├── api/               # Client API centralisé (typed fetch functions)
│   ├── auth/              # AuthProvider, hooks
│   ├── missions/          # Types, templates missions
│   ├── notifications/     # Web Push hooks
│   ├── roles/             # Handlers par rôle
│   ├── supabase/          # Clients Supabase
│   └── utils/             # Utilitaires (cn, generateCode...)
└── types/                 # Types TypeScript
    ├── database.ts        # Types métier
    ├── supabase.ts        # Types générés Supabase
    └── game.ts            # Types jeu

supabase/
├── migrations/            # SQL migrations
└── functions/             # Edge Functions
    └── push/              # Notifications push

docs/                      # Documentation
public/                    # Assets statiques + PWA
```

## Commandes

```bash
npm run dev            # Dev server (Turbopack)
npm run build          # Build production
npm run start          # Serveur production
npm run lint           # ESLint
npm run supabase:types # Générer types TS depuis DB
```

## Fichiers clés

| Fichier | Description |
|---------|-------------|
| `src/app/game/[code]/game-client.tsx` | Orchestrateur principal du jeu |
| `src/app/game/[code]/hooks/` | Custom hooks (useVoting, useTimer, etc.) |
| `src/lib/api/client.ts` | Client fetch centralisé (ApiError, apiGet/Post/Patch/Delete) |
| `src/lib/api/games.ts` | Fonctions API typées (~25 endpoints) |
| `src/lib/supabase/client.ts` | Client Supabase browser |
| `src/lib/utils/player-session.ts` | Gestion sessions joueurs |
| `src/types/supabase.ts` | Types générés depuis DB |
| `src/types/game.ts` | Types jeu (GameSettings, PHASE_DURATIONS) |

## À faire

- [ ] Ajouter `.env.example` avec toutes les variables
- [ ] Script de setup automatisé
- [ ] Tests E2E avec Playwright
- [ ] Storybook pour les composants UI
- [ ] PWA offline support complet

---

*Voir aussi: [SUPABASE.md](./SUPABASE.md), [VERCEL.md](./VERCEL.md)*
