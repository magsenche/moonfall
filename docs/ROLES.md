# 🐺 Rôles

> Game design des rôles, pouvoirs et équipes.

## Équipes

| Équipe | Objectif | Couleur |
|--------|----------|---------|
| 🔵 Village | Éliminer tous les loups | Bleu |
| 🔴 Loups | Égaler ou dépasser le nombre de villageois | Rouge |
| ⚪ Solo | Objectif personnel (ex: Ange = mourir au 1er vote) | Gris |

---

## Rôles MVP

### Villageois
| | |
|---|---|
| **Équipe** | 🔵 Village |
| **Pouvoir** | Aucun |
| **Description** | Simple villageois. Vote le jour pour éliminer les suspects. |

### Loup-Garou
| | |
|---|---|
| **Équipe** | 🔴 Loups |
| **Pouvoir** | Dévore un villageois chaque nuit |
| **Phase** | Nuit |
| **Description** | Se réunit avec les autres loups la nuit pour choisir une victime. Chat privé entre loups. |

### Voyante
| | |
|---|---|
| **Équipe** | 🔵 Village |
| **Pouvoir** | Voit le rôle d'un joueur chaque nuit |
| **Phase** | Nuit |
| **Limite** | 1 vision par nuit |
| **Description** | Peut découvrir le rôle d'un joueur. Information précieuse mais doit rester discrète. |

---

## Rôles futurs - Adaptés IRL 🎮

> **Note importante** : Ces rôles sont adaptés pour une expérience **IRL** où les joueurs ne peuvent pas vraiment "fermer les yeux". Les mécaniques sont repensées pour fonctionner via l'app.

### Priorité haute (Prochaine implémentation)

| Rôle | Équipe | Pouvoir IRL |
|------|--------|-------------|
| **Sorcière** | 🔵 Village | Voit qui va mourir la nuit + 1 potion de vie (annule) + 1 potion de mort (tue un autre joueur) |
| **Chasseur** | 🔵 Village | À sa mort, choisit immédiatement un joueur à emporter avec lui (UI pop-up) |
| **Petite Fille** | 🔵 Village | **Accès en lecture seule au chat des loups** (peut lire mais pas écrire) |

### Priorité moyenne

| Rôle | Équipe | Pouvoir IRL |
|------|--------|-------------|
| **Cupidon** | 🔵 Village | En début de partie, désigne 2 amoureux. Si l'un meurt → l'autre meurt aussi (notification) |
| **Salvateur** | 🔵 Village | Chaque nuit, protège un joueur. Si les loups le ciblent → survit. Ne peut pas se protéger 2x de suite. |
| **Ancien** | 🔵 Village | Survit à la première attaque des loups (consommé automatiquement) |

### Rôles spéciaux

| Rôle | Équipe | Pouvoir IRL |
|------|--------|-------------|
| **Loup Blanc** | ⚪ Solo | Loup-garou visible dans le chat loup, mais une nuit sur deux peut tuer un loup secrètement |
| **Ange** | ⚪ Solo | Gagne immédiatement s'il est éliminé au **premier** conseil. Sinon devient Villageois. |
| **Corbeau** | 🔵 Village | Chaque nuit, désigne un joueur qui aura +2 votes contre lui au prochain conseil |

---

## Architecture technique

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

---

## Distribution des rôles

Algorithme actuel dans `/api/games/[code]/start/` :

1. Calculer le nombre de loups (1 pour 4-6 joueurs, 2 pour 7-10, etc.)
2. Ajouter 1 Voyante
3. Remplir le reste avec des Villageois
4. Mélanger et assigner aléatoirement

---

## 🔧 Implémentation des nouveaux rôles

### 1. Petite Fille 👧 (Facile)

**Concept IRL** : Accès en **lecture seule** au chat des loups.

| Aspect | Détail |
|--------|--------|
| Équipe | 🔵 Village |
| Pouvoir | Voit le chat des loups sans pouvoir écrire |
| Risque | Aucun (contrairement à la version classique) |

**Implémentation** :
```typescript
// game-client.tsx - Condition d'affichage du WolfChatPanel
const canSeeWolfChat = isWolf || isLittleGirl;
const canWriteWolfChat = isWolf; // Petite fille = read-only

// WolfChatPanel.tsx - Props
interface WolfChatPanelProps {
  readOnly?: boolean; // true pour Petite Fille
}
```

**Fichiers à modifier** :
- `src/app/game/[code]/game-client.tsx` - Ajouter condition `isLittleGirl`
- `src/app/game/[code]/components/WolfChatPanel.tsx` - Mode read-only
- `src/config/roles.ts` - Ajouter config UI
- Migration DB - Ajouter rôle

---

### 2. Chasseur 🏹 (Moyen)

**Concept IRL** : À sa mort (vote OU nuit), choisit immédiatement qui emporter.

| Aspect | Détail |
|--------|--------|
| Équipe | 🔵 Village |
| Pouvoir | Quand il meurt, tue un joueur de son choix |
| Déclencheur | Mort par vote OU par loups |

**Implémentation** :
```typescript
// Nouveau composant
// src/app/game/[code]/components/HunterDeathModal.tsx
interface HunterDeathModalProps {
  alivePlayers: Player[];
  onSelectTarget: (targetId: string) => void;
  timeLimit?: number; // Timer optionnel
}

// API endpoint
// POST /api/games/[code]/power/hunter
// Body: { hunterId, targetId }
// → Tue la cible, révèle son rôle
```

**Flow** :
1. Chasseur meurt (vote ou nuit)
2. Modal apparaît IMMÉDIATEMENT sur son écran
3. Il choisit une cible parmi les vivants
4. Cible meurt, rôle révélé
5. Jeu continue

**Fichiers à créer/modifier** :
- `src/app/game/[code]/components/HunterDeathModal.tsx` - Nouveau
- `src/app/api/games/[code]/power/hunter/route.ts` - Nouveau
- `src/app/api/games/[code]/vote/resolve/route.ts` - Trigger si chasseur meurt
- `src/app/api/games/[code]/vote/night/resolve/route.ts` - Trigger si chasseur meurt

---

### 3. Ancien 👴 (Facile)

**Concept IRL** : Survit automatiquement à la 1ère attaque des loups.

| Aspect | Détail |
|--------|--------|
| Équipe | 🔵 Village |
| Pouvoir | Immunité 1x contre les loups (auto) |
| Limite | 1 seule fois, consommé automatiquement |

**Implémentation** :
```typescript
// Dans /api/games/[code]/vote/night/resolve
async function resolveNightVote() {
  const targetPlayer = await getTarget();
  const isElder = targetPlayer.role.name === 'ancien';
  
  if (isElder && !hasUsedElderPower(targetPlayer)) {
    // Marquer pouvoir utilisé
    await markElderPowerUsed(targetPlayer);
    // Ne pas tuer
    return { killed: null, elderSaved: true };
  }
  
  // Sinon, tuer normalement
  await killPlayer(targetPlayer);
}
```

**Fichiers à modifier** :
- `src/app/api/games/[code]/vote/night/resolve/route.ts` - Check Ancien
- Table `power_uses` pour tracker si déjà utilisé

---

### 4. Sorcière 🧙‍♀️ (Moyen)

**Concept IRL** : Voit la victime des loups + 2 potions (vie et mort).

| Aspect | Détail |
|--------|--------|
| Équipe | 🔵 Village |
| Pouvoir 1 | Voit qui va mourir cette nuit |
| Pouvoir 2 | Potion de vie (1x) - sauve la victime |
| Pouvoir 3 | Potion de mort (1x) - tue quelqu'un d'autre |

**Flow de nuit** :
1. Loups votent leur cible
2. Sorcière voit : "Les loups veulent tuer [Alice]"
3. Sorcière peut :
   - Utiliser potion de vie → Alice survit
   - Utiliser potion de mort → Choisit une autre cible
   - Ne rien faire
4. Résolution de la nuit

**Implémentation** :
```typescript
// Nouveau composant
// src/app/game/[code]/components/WitchNightPanel.tsx
interface WitchNightPanelProps {
  wolfTarget: Player | null;      // Qui les loups veulent tuer
  hasLifePotion: boolean;
  hasDeathPotion: boolean;
  alivePlayers: Player[];
  onUseLifePotion: () => void;
  onUseDeathPotion: (targetId: string) => void;
  onSkip: () => void;
}

// La sorcière agit APRÈS les loups, AVANT résolution
```

**Fichiers à créer/modifier** :
- `src/app/game/[code]/components/WitchNightPanel.tsx` - Nouveau
- `src/app/api/games/[code]/power/witch/route.ts` - Nouveau
- `src/app/api/games/[code]/vote/night/resolve/route.ts` - Attendre sorcière

---

### 5. Cupidon 💘 (Complexe)

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

## ✅ Implémenté

- [x] Distribution des 3 rôles MVP (Villageois, Loup-Garou, Voyante)
- [x] Handlers de rôles avec interface extensible
- [x] Pouvoir Voyante (voir un rôle la nuit)
- [x] Chat privé des loups
- [x] Vote nuit des loups
- [x] Distribution custom par MJ (settings partie)

## 🔄 En cours

(Aucun)

## ⏳ À faire - Rôles IRL

### Priorité 1 (Facile)
- [ ] **Petite Fille** - Lecture seule chat loups
- [ ] **Ancien** - Survit 1x à l'attaque des loups

### Priorité 2 (Moyen)  
- [ ] **Chasseur** - Emporte quelqu'un à sa mort
- [ ] **Sorcière** - Potions vie/mort

### Priorité 3 (Complexe)
- [ ] **Cupidon** - Amoureux liés

### Backlog
- [ ] **Salvateur** - Protège un joueur la nuit
- [ ] **Corbeau** - +2 votes contre un joueur
- [ ] **Loup Blanc** - Loup solo qui peut tuer un loup
- [ ] **Ange** - Gagne s'il meurt au 1er conseil

---

*Voir aussi: [INFINITE_MODE.md](./INFINITE_MODE.md) pour le mode respawn*

*Voir aussi: [MISSIONS_DESIGN.md](./MISSIONS_DESIGN.md)*
