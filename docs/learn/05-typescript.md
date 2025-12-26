# 📝 TypeScript

> Types, génériques, type guards.

## Bases

TypeScript = JavaScript + **typage statique**.

```tsx
// Variables typées
const name: string = 'Alice';
const age: number = 25;
const isActive: boolean = true;
const items: string[] = ['a', 'b', 'c'];

// Fonctions typées
function greet(name: string): string {
  return `Hello ${name}`;
}

// Objets typés avec interface
interface Player {
  id: string;
  pseudo: string;
  is_alive: boolean;
}

const player: Player = {
  id: '123',
  pseudo: 'Alice',
  is_alive: true
};
```

---

## Union Types

Une valeur peut être **l'un de plusieurs types**.

```tsx
type GameStatus = 'lobby' | 'jour' | 'nuit' | 'conseil' | 'terminee';

// La variable ne peut être QUE l'une de ces valeurs
const status: GameStatus = 'jour';   // ✅
const status: GameStatus = 'autre';  // ❌ Erreur TypeScript
```

---

## Génériques

Les **génériques** permettent de créer des fonctions/types réutilisables.

```tsx
// T est un "placeholder" pour un type
async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  return res.json() as T;
}

// Utilisation : T devient GameWithPlayers
const game = await apiGet<GameWithPlayers>('/api/games/ABC123');
// game est automatiquement typé !
```

**Dans Moonfall :**
```tsx
// lib/api/client.ts
export async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new ApiError(response);
  return response.json();
}
```

---

## Type Guards

Vérifie le type d'une valeur à l'exécution.

```tsx
// Vérifie si un objet a une propriété 'error'
function isApiError(obj: unknown): obj is { error: string } {
  return typeof obj === 'object' && obj !== null && 'error' in obj;
}

// Utilisation
const result = await fetchSomething();
if (isApiError(result)) {
  console.error(result.error); // TypeScript sait que result.error existe
} else {
  console.log(result.data);    // TypeScript sait que c'est autre chose
}
```

---

## Types utilitaires

### Partial - Tous les champs optionnels
```tsx
interface Player {
  id: string;
  pseudo: string;
  is_alive: boolean;
}

type PartialPlayer = Partial<Player>;
// { id?: string; pseudo?: string; is_alive?: boolean; }
```

### Pick - Seulement certains champs
```tsx
type PlayerPreview = Pick<Player, 'id' | 'pseudo'>;
// { id: string; pseudo: string; }
```

### Omit - Tout sauf certains champs
```tsx
type PlayerWithoutId = Omit<Player, 'id'>;
// { pseudo: string; is_alive: boolean; }
```

### Record - Dictionnaire typé
```tsx
type RoleConfigs = Record<string, RoleConfig>;
// { [key: string]: RoleConfig }
```

---

## Interface vs Type

```tsx
// Interface - pour les objets, extensible
interface Player {
  id: string;
  pseudo: string;
}

interface AdminPlayer extends Player {
  isAdmin: true;
}

// Type - pour unions, intersections, aliases
type Status = 'active' | 'inactive';
type PlayerOrNull = Player | null;
type PlayerWithRole = Player & { role: Role };
```

**Règle simple :** Utilise `interface` pour les objets, `type` pour le reste.

---

## Dans Moonfall

```tsx
// types/game.ts
export type GameStatus = 'lobby' | 'jour' | 'nuit' | 'conseil' | 'terminee';

export interface GameSettings {
  dayDuration: number;
  nightDuration: number;
  councilDuration: number;
  autoMode: boolean;
}

export interface GameWithPlayers extends Game {
  players: PlayerWithRole[];
}

// types/supabase.ts - Généré automatiquement
export interface Database {
  public: {
    Tables: {
      games: { Row: {...}; Insert: {...}; Update: {...}; };
      players: { Row: {...}; };
    };
  };
}
```

---

## Avantages du typage

| Avantage | Exemple |
|----------|---------|
| Autocomplétion | `player.` → suggestions |
| Erreurs à la compilation | Pas de `undefined is not a function` |
| Refactoring sûr | Renommer une propriété → toutes les erreurs visibles |
| Documentation | Les types documentent le code |

---

*Suivant : [06-tailwind.md](./06-tailwind.md)*
