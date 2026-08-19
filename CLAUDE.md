# Moonfall

Loup-Garou grandeur nature : app web compagnon d'une partie IRL qui vit sur des
heures ou des jours — rôles secrets sur téléphone, missions réelles, conseils et
votes. Solo dev + agents IA. Prod : https://moonfall.fr

## Lire d'abord

- `docs/README.md` — index de la doc technique. Avant d'implémenter, lire la doc
  associée ; après un changement significatif (système, rôle, config), **mettre à
  jour la doc correspondante** dans la même PR.
- `docs/SUPABASE.md` — les 14 tables, RLS, Realtime, Edge Functions. C'est le
  contrat de données ; toute migration le met à jour.
- `docs/ROLES.md` et `docs/MISSIONS_DESIGN.md` — le game design. Une mécanique ne
  se change pas sans y être décrite.
- `docs/STACK.md`, `docs/VERCEL.md`, `docs/PUSH_NOTIFICATIONS.md` — infra et
  déploiement. `docs/learn/` = notes d'apprentissage, pas des contrats.
- `.claude/rules/` — les règles opérationnelles : conduite du code (`code.md`),
  design system (`design.md`), sessions cloud (`sessions-cloud.md`). Elles se
  chargent seules ; ce fichier reste la vue d'ensemble.

## Stack (décidée, ne pas re-débattre)

Next.js 16 App Router + React 19 (React Compiler) · TypeScript · Tailwind CSS 4 ·
Framer Motion · Supabase (Postgres + RLS, Auth OTP/anonyme, Realtime channels,
Storage, Edge Functions) · Web Push VAPID · Sentry · Vercel (CD sur main) · PWA
(service worker, safe-areas iOS).

## Commandes

- `npm run dev` · `npm run build` · `npm run lint`
- `npx tsc --noEmit` — le vert de `tsc` + `build` est requis avant tout push
- `npm run supabase:types` — régénère `src/types/supabase.ts` après une migration
- `npm run scenarios` — runner de scénarios API (logique de jeu de bout en bout,
  dev server requis ; voir `docs/SCENARIOS.md`) · `npm run test:unit` — tests
  unitaires des fonctions pures (`node --test`, zéro dépendance).
- Validation avant push : tsc + build + lint, scénarios verts pour tout
  changement de logique de jeu, et parcours visuel du mode Démo (partie avec
  bots, `/api/games/[code]/bots`) pour les changements d'UI.
- Env local : `cp .env.local.example .env.local` (les clés `NEXT_PUBLIC_SUPABASE_*`
  sont publiques by design ; `SUPABASE_SERVICE_ROLE_KEY` ne quitte jamais
  Vercel/local).

## Structure

```
src/
├── app/                # Routes App Router ; api/ (games, health, mission-templates)
│   └── game/[code]/    # La partie : context/ (GameContext, TimerContext),
│                       #   components/, hooks/ (useVoting, useGameRealtime…)
├── components/         # ui/ (génériques : MotionCard, MotionButton…) · game/ (métier)
├── lib/                # api/ (client centralisé), supabase/ (client + queries),
│                       #   roles/, missions/, notifications/, utils/
├── config/ · types/    # Config objects · types générés Supabase
supabase/               # migrations/ · functions/ (Edge Functions)
```

## Conventions & règles dures

- Conventional Commits (`feat:`/`fix:`/`docs:`/`chore:`/`refactor:`) — messages
  de commit et titres de PR.
- Tout passe par PR (draft par défaut) ; review humaine avant merge sauf accord
  explicite du propriétaire.
- Secrets jamais en dur ni commités ; `.env.local` reste local, prod = variables
  Vercel.
- Ne jamais mélanger les projets Supabase de Moonfall et d'Hemiclic (variables
  d'environnement distinctes par environnement Claude).
- Fail loud : pas de fallback silencieux (mock data, no-op, catch vide).
- Français pour la doc produit et le jeu ; anglais accepté pour le code.
