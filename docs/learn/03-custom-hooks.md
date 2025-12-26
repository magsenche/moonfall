# 🪝 Custom Hooks

> Extraire de la logique réutilisable.

## Principe

Un **custom hook** est une fonction qui utilise d'autres hooks pour encapsuler de la logique réutilisable.

```
hooks/
├── useVoting.ts       # Logique de vote
├── useTimer.ts        # Countdown timer
├── useWolfChat.ts     # Chat des loups
└── usePlayerSession.ts # Session joueur (localStorage)
```

---

## Exemple : useTimer

```tsx
// hooks/useTimer.ts
import { useState, useEffect } from 'react';

export function useTimer({ phaseEndsAt }: { phaseEndsAt: string | null }) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!phaseEndsAt) return;
    
    const interval = setInterval(() => {
      const remaining = Math.max(0, new Date(phaseEndsAt).getTime() - Date.now());
      setTimeRemaining(Math.floor(remaining / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [phaseEndsAt]);

  const isExpired = timeRemaining === 0;

  return { timeRemaining, isExpired };
}
```

**Utilisation :**
```tsx
// game-client.tsx
const { timeRemaining, isExpired } = useTimer({ 
  phaseEndsAt: game.phase_ends_at 
});

return (
  <div>
    {isExpired ? 'Temps écoulé!' : `${timeRemaining}s restantes`}
  </div>
);
```

---

## Exemple : useLocalStorage

```tsx
// hooks/useLocalStorage.ts
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  // State initialisé depuis localStorage
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });

  // Sync avec localStorage
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
```

**Utilisation :**
```tsx
const [settings, setSettings] = useLocalStorage('settings', { 
  darkMode: true 
});
```

---

## Dans Moonfall

| Hook | Fichier | Rôle |
|------|---------|------|
| `useVoting` | `hooks/useVoting.ts` | Gestion des votes (submit, confirm) |
| `useTimer` | `hooks/useTimer.ts` | Countdown de phase |
| `useNightActions` | `hooks/useNightActions.ts` | Actions nocturnes (loups, voyante) |
| `useWolfChat` | `hooks/useWolfChat.ts` | Messages du chat loups |
| `useMissions` | `hooks/useMissions.ts` | Fetch et soumission missions |
| `useGameRealtime` | `hooks/useGameRealtime.ts` | Subscriptions Supabase |
| `usePlayerSession` | `hooks/usePlayerSession.ts` | Session localStorage |
| `useAutoGarou` | `hooks/useAutoGarou.ts` | Mode automatique |

---

## Pattern : Hook qui retourne état + actions

```tsx
export function useVoting({ game, currentPlayer }) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitVote = useCallback(async () => {
    if (!selectedTarget) return;
    setIsSubmitting(true);
    try {
      await vote(game.code, selectedTarget, currentPlayer.id);
      setHasVoted(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedTarget, game.code, currentPlayer.id]);

  const resetVote = useCallback(() => {
    setSelectedTarget(null);
    setHasVoted(false);
  }, []);

  return {
    // État
    selectedTarget,
    hasVoted,
    isSubmitting,
    // Actions
    setSelectedTarget,
    submitVote,
    resetVote,
  };
}
```

**Utilisation :**
```tsx
const { 
  selectedTarget, 
  hasVoted, 
  submitVote, 
  setSelectedTarget 
} = useVoting({ game, currentPlayer });
```

---

## Règles pour les custom hooks

1. **Nom commence par `use`** → `useTimer`, `useVoting`
2. **Un seul responsabilité** → Ne pas tout mettre dans un hook géant
3. **Retourner un objet** → Plus lisible que des tuples pour beaucoup de valeurs
4. **Cleanup dans useEffect** → Éviter les memory leaks

---

*Suivant : [04-supabase.md](./04-supabase.md)*
