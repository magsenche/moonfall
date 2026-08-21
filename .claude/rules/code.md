---
paths:
  - "src/**"
---

# Conduite du code

- **État global** : `GameContext` (`useGame()`) porte l'état de la partie.
  `TimerContext` est isolé exprès pour la perf — seuls le header et la logique de
  jeu se re-rendent chaque seconde ; ne rien y raccrocher d'autre.
- **Accès données** : tout passe par `lib/api` (client centralisé) et
  `lib/supabase` (queries). Jamais de requête Supabase directe dans un composant.
- **Config-driven** : rôles, pouvoirs et réglages vivent en DB ou dans des config
  objects (`src/config`, `lib/roles`) — pas de logique de rôle en dur dans l'UI.
- **Chercher avant de créer** : grep un pattern existant (hook, composant ui/,
  helper) avant d'en écrire un nouveau ; extraire le partagé vers `lib/utils`,
  `components/ui`.
- **Découper** au-delà de ~300 lignes par composant ; state au plus près de son
  usage, pas de prop drilling au-delà de 2 niveaux.

## Perf mobile (règles apprises à l'audit 2026-08)

- **State de saisie/sélection JAMAIS dans GameContext** : une cible en cours de
  sélection ou un texte tapé vivent dans leur panneau (`useState` local). Le
  contexte n'expose que l'action (`submitVote(targetId)`).
- **Actions optimistes** : le tap bascule l'UI immédiatement, rollback + message
  d'erreur dans le catch (jamais de rollback silencieux).
- **Channels realtime filtrés par `game_id`** — sans filtre, chaque client
  reçoit les events de toutes les parties du serveur.
- **`router.refresh()` interdit sur les events realtime** (le channel a déjà mis
  l'état à jour) — seule exception : la transition lobby → en jeu (rôles).
- **Pas de `backdrop-blur` sur un élément animé** au-dessus du fond animé ;
  animations infinies décoratives en CSS (`animate-twinkle`) plutôt que
  framer-motion ; prop `layout` de framer-motion réservée aux cas qui la
  justifient (FLIP = reflow par frame).
- **Code-splitting** : un bloc lourd hors du chemin critique (lobby, game over,
  drawers) se charge en `next/dynamic`.

## Anti-patterns

`any` · `console.log` en prod · requête Supabase dans un composant · dupliquer un
pattern existant sans avoir grep d'abord · re-render global branché sur le timer ·
state de saisie dans le contexte global · channel realtime sans filtre ·
test snapshot · fallback silencieux.
