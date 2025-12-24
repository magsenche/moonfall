# 🐺 Moonfall

> App web pour jouer au Loup-Garou IRL avec missions réelles.

🔗 **Production :** https://moonfall.vercel.app

## Concept

Chaque joueur reçoit un rôle secret. Missions IRL + conseils réguliers avec éliminations par vote.

## Quick Start

```bash
# Cloner
git clone https://github.com/magsenche/moonfall.git
cd moonfall

# Installer
npm install

# Configurer (copier et remplir les variables)
cp .env.example .env.local

# Lancer
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Stack

| Composant | Technologie |
|-----------|-------------|
| Framework | Next.js 16 (App Router, React 19) |
| Styling | Tailwind CSS 4 |
| Backend | Supabase (PostgreSQL, Realtime, Auth) |
| Notifications | Web Push (VAPID) |
| Hébergement | Vercel |

## Documentation

Voir [`docs/`](./docs/README.md) pour la documentation technique complète :

- [STACK.md](./docs/STACK.md) - Installation, structure projet
- [SUPABASE.md](./docs/SUPABASE.md) - Database, Realtime, Edge Functions
- [VERCEL.md](./docs/VERCEL.md) - Déploiement
- [PUSH_NOTIFICATIONS.md](./docs/PUSH_NOTIFICATIONS.md) - Web Push
- [ROLES.md](./docs/ROLES.md) - Game design des rôles
- [MISSIONS_DESIGN.md](./docs/MISSIONS_DESIGN.md) - Système de missions

## Commandes

```bash
npm run dev           # Dev server
npm run build         # Build production
npm run supabase:types # Générer types TypeScript depuis DB
```

## Licence

MIT
