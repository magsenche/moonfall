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

## Rôles futurs (Backlog)

### Priorité haute

| Rôle | Équipe | Pouvoir |
|------|--------|---------|
| **Sorcière** | 🔵 Village | 1 potion de vie (ressuscite) + 1 potion de mort (tue) par partie |
| **Chasseur** | 🔵 Village | Quand il meurt, emporte un joueur avec lui |
| **Salvateur** | 🔵 Village | Protège un joueur de l'attaque des loups chaque nuit |

### Priorité moyenne

| Rôle | Équipe | Pouvoir |
|------|--------|---------|
| **Cupidon** | 🔵 Village | Désigne 2 amoureux en début de partie. Si l'un meurt, l'autre aussi. |
| **Petite Fille** | 🔵 Village | Peut espionner les loups la nuit (risque de se faire repérer) |
| **Ancien** | 🔵 Village | Résiste à la première attaque des loups |

### Rôles spéciaux

| Rôle | Équipe | Pouvoir |
|------|--------|---------|
| **Loup Blanc** | ⚪ Solo | Loup-garou qui veut être le dernier survivant. Peut tuer un loup certaines nuits. |
| **Ange** | ⚪ Solo | Gagne s'il est éliminé au premier vote du village |
| **Voleur** | ⚪ Variable | Choisit son rôle parmi 2 cartes au début |

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

## ✅ Implémenté

- [x] Distribution des 3 rôles MVP (Villageois, Loup-Garou, Voyante)
- [x] Handlers de rôles avec interface extensible
- [x] Pouvoir Voyante (voir un rôle la nuit)
- [x] Chat privé des loups
- [x] Vote nuit des loups
- [x] Distribution custom par MJ (settings partie)

## À faire

- [ ] Implémenter Sorcière (priorité)
- [ ] Implémenter Chasseur
- [ ] Implémenter Salvateur
- [ ] Équilibrage automatique selon le nombre de joueurs
- [ ] Images/illustrations pour chaque rôle
- [ ] Animations de révélation de rôle

---

*Voir aussi: [MISSIONS_DESIGN.md](./MISSIONS_DESIGN.md)*
