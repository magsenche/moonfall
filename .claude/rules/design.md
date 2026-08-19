---
paths:
  - "src/app/**"
  - "src/components/**"
---

# Design system « Nuit de village »

- **Tokens sémantiques** dans `globals.css`, seuls autorisés pour les couleurs :
  nuit (`night-*`), lune crème/ambre (`moon-*`), rouge sang (`blood-*`) — réservé
  aux loups et au danger —, bleu village, gris solo. Les palettes Tailwind brutes
  (slate/zinc/indigo/purple/red génériques) sont des restes à migrer, pas des
  options.
- **Typo** : Fraunces (display serif, via `next/font`) pour les titres, Inter
  pour l'UI.
- **Icônes** : Lucide dans tout le chrome UI (header, footer, lobby, votes,
  boutique, drawers…). Les emojis sont réservés au **contenu** — icônes de rôles
  en DB, avatars — et n'en sortent pas ; ne pas « corriger » ces emojis-là.
- **Style** : cartes/boutons « sticker » unifiés (MotionCard, MotionButton),
  scènes de phase dans `phase-background.tsx` (lune+étoiles la nuit, halo de
  soleil le jour, braises au conseil) avec fondu croisé.
- CTA principal = ambre lunaire ; vérifier le contraste sur fond nuit avant de
  pousser un nouveau couple couleur/texte.
- **Son** : jingles de phase synthétisés WebAudio dans `src/lib/sounds`
  (aucun asset audio), joués par `SoundEffects` + vibrations ; mute persisté,
  déblocage iOS au premier tap. Tout nouveau son passe par ce module.
