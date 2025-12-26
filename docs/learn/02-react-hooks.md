# ⚛️ React Hooks

> useState, useEffect, useMemo, useCallback.

## useState - Gérer l'état local

Déclare une variable d'état + une fonction pour la modifier.

```tsx
const [count, setCount] = useState(0);
const [name, setName] = useState('');
const [isLoading, setIsLoading] = useState(false);

// Utilisation
setCount(5);           // Remplace par 5
setCount(c => c + 1);  // Incrémente (+1)
```

**Dans Moonfall :**
```tsx
// game-client.tsx
const [game, setGame] = useState<GameWithPlayers>(initialGame);
const [showHunterModal, setShowHunterModal] = useState(false);
```

---

## useEffect - Effets de bord

Exécute du code **après** le rendu, ou quand des dépendances changent.

```tsx
// Exécute UNE FOIS au montage ([] = pas de dépendances)
useEffect(() => {
  console.log('Composant monté !');
}, []);

// Exécute CHAQUE FOIS que `userId` change
useEffect(() => {
  fetchUser(userId);
}, [userId]);

// Avec cleanup (ex: unsubscribe)
useEffect(() => {
  const sub = subscribe();
  return () => sub.unsubscribe(); // Cleanup au démontage
}, []);
```

**Dans Moonfall :**
```tsx
// Quand le jeu se termine, récupérer le gagnant
useEffect(() => {
  if (game.status !== 'terminee') return;
  fetchWinner();
}, [game.status]);
```

---

## useMemo - Mémoriser un calcul coûteux

Évite de recalculer une valeur si les dépendances n'ont pas changé.

```tsx
// Sans useMemo : recalculé à CHAQUE rendu
const filtered = items.filter(i => i.active);

// Avec useMemo : recalculé SEULEMENT si `items` change
const filtered = useMemo(() => {
  return items.filter(i => i.active);
}, [items]);
```

**Dans Moonfall :**
```tsx
// MissionsSection.tsx - Filtrer les missions
const filteredMissions = useMemo(() => {
  if (filter === 'all') return missions;
  if (filter === 'active') return missions.filter(m => m.status === 'pending');
  return missions.filter(m => m.status === 'completed');
}, [missions, filter]);
```

---

## useCallback - Mémoriser une fonction

Évite de recréer une fonction à chaque rendu.

```tsx
// Sans useCallback : nouvelle fonction à chaque rendu
const handleClick = () => doSomething(id);

// Avec useCallback : même référence si `id` n'a pas changé
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

**Dans Moonfall :**
```tsx
const copyCode = useCallback(async () => {
  await navigator.clipboard.writeText(game.code);
  setCopied(true);
}, [game.code]);
```

---

## Quand utiliser quoi ?

| Hook | Quand l'utiliser |
|------|------------------|
| `useState` | Stocker une valeur qui change |
| `useEffect` | Fetch, subscriptions, timers, sync avec externe |
| `useMemo` | Calcul coûteux (filter, sort, map complexe) |
| `useCallback` | Fonction passée en prop à un composant mémorisé |

---

## Règles des Hooks

1. **Toujours au top level** - Pas dans des if/for/fonctions imbriquées
2. **Seulement dans des composants React** - Ou des custom hooks
3. **Préfixe `use`** - Pour les custom hooks

```tsx
// ❌ Mauvais
if (condition) {
  const [value, setValue] = useState(0);
}

// ✅ Bon
const [value, setValue] = useState(0);
if (condition) {
  // utiliser value ici
}
```

---

*Suivant : [03-custom-hooks.md](./03-custom-hooks.md)*
