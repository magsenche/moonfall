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
- **Écran de jeu mobile-first** : dans les layouts de phase, l'ordre est
  consigne (`PhaseHint`, une ligne) → rôle (`PlayerRoleCard`, pilule compacte
  une fois révélé) → panneau d'action — l'action de la phase reste au-dessus du
  fold (~740 px utiles sur iPhone). La liste des joueurs du footer est
  repliable (dépliée le jour, repliée nuit/conseil où la grille de cibles fait
  le job). Bande flottante : FAB missions/règles z-30 à `bottom-20`, mute et
  « Prêt » z-40 à `bottom-4`, `TipToast` à `bottom-36` (jamais sur un bouton),
  contenu avec `pb-36`. Pas de doublon d'information sur un même scroll.
- **Narration** : le rideau de phase (`PhaseCurtain`, z-[70]) tombe à chaque
  transition et raconte la partie (textes composés serveur dans
  `lib/game/narration.ts` — mêmes lignes sur tous les téléphones, causes
  secrètes jamais révélées). Tap pour passer, disparition auto. Le récap du
  dernier conseil vit dans `CouncilRecapCard` (footer, repliée).
- **Narration** : le rideau de phase (`PhaseCurtain` + `lib/game/narration`)
  parle avec la voix du narrateur de la partie — Corbeau (humour noir),
  Commère (potins), Aubergiste (bonhomme) ou Garde-Champêtre (pompeux,
  administratif), tiré de l'id de partie et stable du premier rideau au
  dernier. Mise en scène : il se présente à la nuit 1 (intro + signature en
  avant + son motif sonore `playNarratorCue`), puis signe chaque rideau
  (emoji + nom). Les faits (morts, rôles) restent neutres, la personnalité
  colore les ambiances et commente les verdicts. Le fond du rideau reste
  celui de la PHASE (info de gameplay) — l'identité du narrateur passe par
  le texte, l'emoji et le son, pas par la couleur. Tout nouveau texte de
  narration se décline dans les quatre voix, en 3 variantes.
- **Son** : jingles de phase synthétisés WebAudio dans `src/lib/sounds`
  (aucun asset audio), joués par `SoundEffects` + vibrations ; mute persisté,
  déblocage iOS au premier tap. Tout nouveau son passe par ce module.
