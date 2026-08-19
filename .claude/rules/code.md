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

## Anti-patterns

`any` · `console.log` en prod · requête Supabase dans un composant · dupliquer un
pattern existant sans avoir grep d'abord · re-render global branché sur le timer ·
test snapshot · fallback silencieux.
