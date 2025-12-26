# 📖 Système d'Aide In-Game

> Design et implémentation du système d'aide intégré pour les nouveaux joueurs.

## 🎯 Objectifs

- Expliquer les règles sans quitter le jeu
- Permettre aux nouveaux joueurs de comprendre leur rôle
- Aide contextuelle selon la phase de jeu
- Non-intrusif pour les joueurs expérimentés

---

## 🧩 Composants

### 1. Carte de Rôle Cliquable → Modal Détaillé

**Déclencheur** : Clic sur la carte de rôle (PlayerRoleCard)

**Contenu du modal** :
- 🎭 Nom du rôle + icône grand format
- 📝 Description complète (plus détaillée que la carte)
- ⚡ Pouvoir expliqué avec timing (quand l'utiliser)
- 🎯 Objectif de victoire (équipe)
- 💡 Conseils stratégiques (2-3 tips)
- 🤝 Interactions avec autres rôles (optionnel)

**Exemple - Voyante** :
```
🔮 Voyante
Équipe Village 🔵

Tu possèdes le don de clairvoyance et peux percer les secrets 
des habitants du village.

⚡ POUVOIR
Chaque nuit, tu peux découvrir le rôle d'un joueur de ton choix.
Le panneau de vision apparaît automatiquement pendant la nuit.

🎯 OBJECTIF  
Aide le village à identifier et éliminer tous les loups-garous.

💡 CONSEILS
• Garde tes informations secrètes pour ne pas devenir une cible
• Si tu découvres un loup, trouve un moyen subtil de l'accuser
• Les loups peuvent mentir sur leur rôle - reste méfiant
```

---

### 2. Aide Contextuelle par Phase (?)

**Emplacement** : À côté du badge de phase (PhaseTimer)

**Comportement** : Clic → popover/tooltip avec explication

**Contenu par phase** :

| Phase | Explication |
|-------|-------------|
| 🌙 **Nuit** | "Les loups-garous se concertent et choisissent une victime. Les rôles avec pouvoirs nocturnes agissent." |
| ☀️ **Jour** | "Le village se réveille et découvre si quelqu'un a été tué. Discutez pour trouver les loups !" |
| ⚖️ **Conseil** | "Le village vote pour éliminer un suspect. La personne avec le plus de votes est éliminée." |
| 🏁 **Terminée** | "La partie est finie ! Consultez les rôles de chacun." |

---

### 3. Page Règles

**Accès** : 
- Bouton "📖 Règles" dans le lobby (visible)
- Icône "?" discrète pendant la partie (header ou footer)

**Structure** :
```
📖 Règles du Loup-Garou

1. PRINCIPE DU JEU
   - Deux équipes s'affrontent : Village vs Loups
   - Chaque joueur a un rôle secret
   - Le village gagne si tous les loups sont éliminés
   - Les loups gagnent s'ils égalent ou dépassent le nombre de villageois

2. DÉROULEMENT
   - 🌙 Nuit : Les loups votent pour dévorer quelqu'un
   - ☀️ Jour : Discussion entre joueurs
   - ⚖️ Conseil : Vote pour éliminer un suspect

3. RÔLES
   [Liste cliquable avec aperçu]
   - 👤 Villageois
   - 🐺 Loup-Garou
   - 🔮 Voyante
   - 👧 Petite Fille
   - 👴 Ancien
   - 🏹 Chasseur
   - 🧪 Sorcière

4. FAQ
   - Égalité au vote ? → Pas d'élimination
   - Peut-on mentir ? → Oui, c'est le jeu !
   - ...
```

---

### 4. First-Time Tips (Bulles d'Aide)

**Comportement** :
- Apparaît une seule fois (localStorage)
- Petit toast/bulle non-bloquante
- Bouton "OK" ou "Ne plus afficher"

**Tips prévus** :

| Moment | Tip |
|--------|-----|
| 1ère partie | "💡 Bienvenue ! Clique sur ta carte de rôle pour plus de détails." |
| 1er vote | "💡 Clique sur un joueur pour voter contre lui." |
| 1ère nuit (loup) | "💡 Coordonne-toi avec ta meute via le chat privé !" |
| 1ère nuit (voyante) | "💡 Choisis un joueur pour découvrir son rôle." |
| Chasseur mort | "💡 Tu peux emporter quelqu'un avec toi ! Choisis bien." |

**Stockage** :
```typescript
// localStorage key
'moonfall_tips_dismissed': {
  'welcome': true,
  'first_vote': true,
  'wolf_chat': false,
  // ...
}
```

---

## 📁 Structure des Fichiers

```
src/
├── components/
│   └── game/
│       ├── role-detail-modal.tsx    # ✅ Modal détaillé du rôle
│       ├── phase-help-tooltip.tsx   # ✅ Bottom sheet aide phase
│       ├── rules-modal.tsx          # ✅ Modal règles + RulesButton
│       └── tip-toast.tsx            # ✅ Bulles d'aide + hooks
├── lib/
│   └── help/
│       ├── index.ts                 # ✅ Exports
│       ├── role-details.ts          # ✅ Textes détaillés par rôle (8 rôles)
│       ├── phase-descriptions.ts    # ✅ Descriptions des phases
│       └── tips.ts                  # ✅ Configuration des tips (9 tips)
└── config/
    └── roles.ts                     # ✅ Fallback configs (DB = source of truth)
```

---

## 🎨 Design

### Palette
- Fond modal : `bg-zinc-900/95` (semi-transparent)
- Bordure : `border-zinc-700`
- Texte principal : `text-zinc-100`
- Texte secondaire : `text-zinc-400`
- Accent (village) : `text-blue-400`
- Accent (loups) : `text-red-400`

### Animations
- Modal : fade-in + scale légère
- Tooltip : fade-in rapide
- Tips : slide-in depuis le bas

---

## ✅ Checklist Implémentation

- [x] **RoleDetailModal** - Modal cliquable sur carte de rôle
  - [x] Composant modal (`src/components/game/role-detail-modal.tsx`)
  - [x] Contenu par rôle (`src/lib/help/role-details.ts`)
  - [x] Intégration dans PlayerRoleCard
  
- [x] **PhaseHelpTooltip** - Aide contextuelle phase
  - [x] Composant bottom sheet modal (`src/components/game/phase-help-tooltip.tsx`)
  - [x] Descriptions par phase (`src/lib/help/phase-descriptions.ts`)
  - [x] Intégration dans GamePhaseBadge (avec `showHelp` prop)
  
- [x] **RulesModal** - Page règles complète
  - [x] Modal avec tabs (Règles, Rôles, FAQ) (`src/components/game/rules-modal.tsx`)
  - [x] Contenu complet avec accordéons pour les rôles
  - [x] `RulesButton` composant autonome (variants: default, icon, floating)
  - [x] Bouton flottant accessible pendant le jeu
  
- [x] **TipToast** - Bulles d'aide
  - [x] Composant toast (`src/components/game/tip-toast.tsx`)
  - [x] Hook `useTip` et `useGameTips` pour gestion contextuelle
  - [x] Stockage localStorage (`src/lib/help/tips.ts`)
  - [x] Triggers contextuels (lobby, vote, nuit loup, voyante, petite fille, sorcière)

---

## 📱 Mobile First

- [x] Touch-friendly (boutons 44px+ minimum)
- [x] Bottom sheet modals sur mobile (slide-in-from-bottom)
- [x] Drag indicator sur les modales mobiles
- [x] `touch-manipulation` pour supprimer délai 300ms
- [x] Bouton flottant (FAB) pour accès règles

---

*Document créé le 25/12/2025*
*Dernière mise à jour: 26/12/2025 - Système complet implémenté*
