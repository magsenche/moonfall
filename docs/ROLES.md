# 🐺 Rôles

> Game design des rôles, pouvoirs et équipes.

## Rôles Implémentés 🎮

### Rôles Village (11 rôles)

| Rôle | Pouvoir IRL | Status | Notes Techniques |
|------|-------------|--------|------------------|
| **Villageois** | Aucun | ✅ Implémenté | Vote standard, **x1.5 mission points** ✅ |
| **Voyante** | Voit le rôle d'un joueur chaque nuit | ✅ Implémenté | Historique persistant, icône équipe |
| **Petite Fille** | Accès lecture seule chat loups | ✅ Implémenté | Pseudos loups masqués ("🐺 ???") |
| **Ancien** | Survit à la 1ère attaque | ✅ Implémenté | Passif géré par `resolveNightVote` |
| **Chasseur** | Tire à sa mort | ✅ Implémenté | `HunterDeathModal` + API dédiée |
| **Sorcière** | Potions Vie/Mort | ✅ Implémenté | `WitchNightPanel`, 1 usage unique/potion |
| **Salvateur** | Protège un joueur chaque nuit | ✅ Implémenté | `SalvateurNightPanel`, pas 2x de suite même cible |
| **Trublion** | Échange les rôles de 2 joueurs | ✅ Implémenté | `TrublionNightPanel`, 1x par partie |
| **Enfant Sauvage** | Devient loup si modèle meurt | ✅ Implémenté | `WildChildModelPanel`, transformation auto |
| **Cupidon** | Désigne 2 amoureux en début de partie | ✅ Implémenté | `CupidonLoversPanel`, mort par chagrin liée |

### Rôles Loups

| Rôle | Pouvoir IRL | Status | Notes Techniques |
|------|-------------|--------|------------------|
| **Loup-Garou** | Dévore un villageois, chat privé | ✅ Implémenté | Vote de nuit majoritaire |

### Rôles Solo

| Rôle | Pouvoir IRL | Status | Notes Techniques |
|------|-------------|--------|------------------|
| **Assassin** | Tue un joueur (1x), gagne seul | ✅ Implémenté | `AssassinPowerPanel`, utilisable jour/nuit |

### Rôles futurs

| Rôle | Équipe | Pouvoir IRL |
|------|--------|-------------|
| **Loup Blanc** | ⚪ Solo | Loup-garou visible dans le chat loup, mais une nuit sur deux peut tuer un loup secrètement |
| **Ange** | ⚪ Solo | Gagne immédiatement s'il est éliminé au **premier** conseil. Sinon devient Villageois. |
| **Corbeau** | 🔵 Village | Chaque nuit, désigne un joueur qui aura +2 votes contre lui au prochain conseil |

---

## Équipes

| Équipe | Objectif | Couleur |
|--------|----------|---------|
| 🔵 Village | Éliminer tous les loups | Bleu |
| 🔴 Loups | Égaler ou dépasser le nombre de villageois | Rouge |
| ⚪ Solo | Objectif personnel (ex: Ange = mourir au 1er vote) | Gris |

---

## Architecture Technique

### Base de données

```sql
-- Table roles
roles (
  id, name, team, description, icon, image_url, created_at
)

-- Table powers
powers (
  id, role_id, name, description, phase, priority, uses_per_game, created_at
)

-- Utilisation des pouvoirs
power_uses (
  id, game_id, player_id, power_id, target_player_id, phase, result, created_at
)
```

### Résolution partagée (`src/lib/game/`)

La logique de résolution commune aux routes API vit dans `src/lib/game/` :

- `resolution.ts` — fonctions **pures** (testées par `npm run test:unit`) :
  `tallyVotes` (décompte + égalités + double vote), `computeWinner`
  (conditions de victoire), `isAutoMode`.
- `deaths.ts` — cascade de morts appelée après **chaque** mort, quelle qu'en
  soit la cause (dévoration, vote, tir du chasseur, assassinat, poison) :
  `applyDeathCascade` (chagrin des amoureux + transformation de l'Enfant
  Sauvage) et `endGameIfVictory` (clôture + colonne `winner` + événement).

Règle **Auto-Garou** : le MJ joue comme les autres — il est ciblable (votes,
pouvoirs, loups) et compte dans les conditions de victoire. En mode normal
(MJ arbitre), il reste intouchable et hors décompte.

La couverture de ces règles est validée par le runner de scénarios
(`docs/SCENARIOS.md`).

### Handlers de rôles

Chaque rôle a un handler qui définit son comportement :

```typescript
// src/lib/roles/base.ts
export interface RoleHandler {
  name: string
  team: 'village' | 'loups' | 'solo'
  canActDuringPhase: (phase: string) => boolean
  getActions: (game: Game, player: Player) => Action[]
  executeAction: (action: Action, game: Game) => Promise<ActionResult>
}
```

**Handlers existants:**
- `src/lib/roles/villageois.ts`
- `src/lib/roles/loup-garou.ts`
- `src/lib/roles/voyante.ts`

### Ajouter un nouveau rôle

1. **Ajouter en DB** (migration) :
```sql
INSERT INTO roles (name, team, description, icon) 
VALUES ('sorciere', 'village', 'Possède 2 potions...', '🧙‍♀️');

INSERT INTO powers (role_id, name, phase, uses_per_game) 
VALUES 
  ((SELECT id FROM roles WHERE name = 'sorciere'), 'potion_vie', 'nuit', 1),
  ((SELECT id FROM roles WHERE name = 'sorciere'), 'potion_mort', 'nuit', 1);
```

2. **Créer le handler** (`src/lib/roles/sorciere.ts`)

3. **Enregistrer** dans `src/lib/roles/index.ts`

4. **Ajouter l'API route** si nécessaire (`/api/games/[code]/power/sorciere/`)

---

## Fichiers clés

| Fichier | Description |
|---------|-------------|
| `src/lib/roles/base.ts` | Interface RoleHandler |
| `src/lib/roles/index.ts` | Registry des handlers |
| `src/lib/roles/villageois.ts` | Handler Villageois |
| `src/lib/roles/loup-garou.ts` | Handler Loup-Garou |
| `src/lib/roles/voyante.ts` | Handler Voyante |
| `src/config/roles.ts` | Config UI (couleurs, icônes) |
| `src/components/game/role-badge.tsx` | Affichage rôle |

### Composants UI

- `PlayerRoleCard` : Carte 3D flippable avec persistance localStorage.
- `RoleDetailModal` : Aide contextuelle détaillée.
- `SeerHistoryPanel` : Rétrospective des visions pour la Voyante.

### Interactions Spécifiques

- **Voyante vs Changement de Phase** : L'état "pouvoir utilisé" est reset à chaque nouvelle nuit. L'historique est conservé.
- **Bots** : Les bots (mode démo/test) votent automatiquement pour ne pas bloquer la partie ("Lazy Voting").

---

## Distribution des rôles

Trois modes dans `/api/games/[code]/start/` :

1. **Partie classique** (`settings.classicComposition`) — composition starter
   calculée au démarrage selon le nombre de joueurs présents
   (`src/lib/game/composition.ts`, pure et testée) : ~1 loup pour 4 joueurs,
   voyante dès 4, sorcière dès 6, chasseur dès 7, reste villageois. Le
   préréglage « Classique » du lobby l'active et désactive missions/boutique
   (`missionsEnabled`/`shopEnabled` à false) pour une première partie épurée.
2. **Distribution personnalisée** (`settings.rolesDistribution`) — comptes par
   rôle configurés par le MJ dans le lobby.
3. **Automatique** (défaut) — ~1/3 loups, 1 voyante, reste villageois.

Dans tous les cas : mélange et assignation aléatoires.

---

## 🔧 Rôle à implémenter : Cupidon 💘

**Concept IRL** : Désigne 2 amoureux en début de partie.

| Aspect | Détail |
|--------|--------|
| Équipe | 🔵 Village |
| Pouvoir | Lie 2 joueurs - si l'un meurt, l'autre aussi |
| Phase | Agit UNE SEULE FOIS après distribution des rôles |

**Flow** :
1. Partie démarre, rôles distribués
2. SI Cupidon présent → Phase spéciale "cupidon"
3. Cupidon choisit 2 joueurs (peut se choisir lui-même)
4. Les 2 amoureux voient un badge ❤️ et savent qu'ils sont liés
5. Partie continue normalement
6. Si un amoureux meurt → L'autre meurt de chagrin

**Cas spécial** : Si un Loup et un Villageois sont amoureux, ils doivent éliminer tous les autres pour gagner ensemble !

**Implémentation** :
```sql
-- Nouvelle table
lovers (
  id UUID PRIMARY KEY,
  game_id UUID REFERENCES games(id),
  player1_id UUID REFERENCES players(id),
  player2_id UUID REFERENCES players(id),
  created_at TIMESTAMP DEFAULT NOW()
)
```

```typescript
// Nouveau composant
// src/app/game/[code]/components/CupidPhase.tsx
interface CupidPhaseProps {
  players: Player[];
  onSelectLovers: (player1Id: string, player2Id: string) => void;
}

// Hook dans resolvers (vote et nuit)
async function checkLoversDeath(deadPlayerId: string) {
  const lovers = await getLovers(gameId);
  if (lovers?.player1_id === deadPlayerId) {
    await killPlayer(lovers.player2_id, 'chagrin');
  }
  if (lovers?.player2_id === deadPlayerId) {
    await killPlayer(lovers.player1_id, 'chagrin');
  }
}
```

**Fichiers à créer/modifier** :
- Migration DB - Table `lovers`
- `src/app/game/[code]/components/CupidPhase.tsx` - Nouveau
- `src/app/api/games/[code]/power/cupid/route.ts` - Nouveau
- `src/app/api/games/[code]/start/route.ts` - Ajouter phase cupidon
- Tous les resolvers de mort - Check amoureux

---

## ⏳ À faire - Futurs rôles

### Priorité haute
- [ ] **Cupidon** - Amoureux liés (complexe, voir section dédiée ci-dessus)

### Backlog
- [ ] **Corbeau** - +2 votes contre un joueur désigné
- [ ] **Loup Blanc** - Loup solo qui peut tuer un loup
- [ ] **Ange** - Gagne s'il meurt au 1er conseil

---

*Dernière mise à jour: 30/12/2025*
