# 📄 Next.js Basics

> Structure du projet et App Router.

## Structure du Projet

```
moonfall/
├── src/
│   ├── app/           # 📄 Pages et routes (Next.js App Router)
│   ├── components/    # 🧩 Composants réutilisables
│   ├── config/        # ⚙️ Configuration statique
│   ├── lib/           # 📚 Logique métier, utilitaires, API
│   └── types/         # 📝 Types TypeScript
├── public/            # 🖼️ Fichiers statiques (images, icons)
├── supabase/          # 🗄️ Migrations DB + Edge Functions
└── docs/              # 📖 Documentation
```

---

## App Router - File-based Routing

Next.js utilise le **file-based routing** : la structure des dossiers = les URLs.

```
app/
├── page.tsx              → URL: /           (page d'accueil)
├── layout.tsx            → Layout global (wrap toutes les pages)
├── auth/
│   └── login/
│       └── page.tsx      → URL: /auth/login
├── game/
│   └── [code]/           → URL dynamique: /game/ABC123
│       ├── page.tsx      → Composant serveur (fetch initial)
│       └── game-client.tsx → Composant client (interactif)
└── api/                  → API Routes (backend)
    └── games/
        └── route.ts      → GET/POST /api/games
```

---

## Concepts clés

| Fichier | Rôle |
|---------|------|
| `page.tsx` | Une page accessible via URL |
| `layout.tsx` | Wrapper commun (header, providers) |
| `[code]` | Paramètre dynamique (ex: `/game/ABC123`) |
| `route.ts` | Endpoint backend (API Route) |

---

## Server vs Client Components

```tsx
// Server Component (par défaut)
// - Rendu côté serveur
// - Peut faire des requêtes DB directement
// - Pas d'interactivité (pas de useState, onClick...)
export default async function Page() {
  const data = await fetchFromDB(); // ✅ Possible
  return <div>{data}</div>;
}
```

```tsx
// Client Component
// - Rendu côté client (navigateur)
// - Interactif (useState, useEffect, onClick...)
// - Doit être marqué avec 'use client'
'use client';

export default function GameClient() {
  const [count, setCount] = useState(0); // ✅ Possible
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

---

## Dans Moonfall

```
game/[code]/
├── page.tsx         # Server Component → fetch initial du game
└── game-client.tsx  # Client Component → interactivité (votes, chat...)
```

```tsx
// page.tsx - Fetch initial
export default async function GamePage({ params }) {
  const { code } = await params;
  const game = await fetchGame(code);  // Serveur
  return <GameClient initialGame={game} />;
}

// game-client.tsx - Interactif
'use client';
export default function GameClient({ initialGame }) {
  const [game, setGame] = useState(initialGame);
  // ... subscriptions realtime, votes, etc.
}
```

---

## Dossiers spéciaux

| Dossier | Contenu |
|---------|---------|
| `components/ui/` | Composants génériques (Button, Card, Input) |
| `components/game/` | Composants spécifiques au jeu |
| `lib/api/` | Client API (fetch vers /api/...) |
| `lib/supabase/` | Client base de données |
| `lib/utils/` | Utilitaires purs (cn, generateCode...) |
| `config/` | Configuration statique (thème, rôles) |
| `types/` | Types TypeScript |

---

*Suivant : [02-react-hooks.md](./02-react-hooks.md)*
