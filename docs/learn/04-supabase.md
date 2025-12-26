# 🗄️ Supabase

> Client, Realtime, requêtes DB.

## Client Supabase

```tsx
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

// Utilisation
const supabase = createClient();
```

---

## Requêtes de base

### SELECT (lire)
```tsx
// Tous les joueurs d'une partie
const { data, error } = await supabase
  .from('players')
  .select('*')
  .eq('game_id', gameId);

// Avec relations (jointures)
const { data } = await supabase
  .from('players')
  .select(`
    *,
    role:roles(*)
  `)
  .eq('game_id', gameId);
```

### INSERT (créer)
```tsx
const { data, error } = await supabase
  .from('players')
  .insert({
    game_id: gameId,
    pseudo: 'Alice',
    is_alive: true
  })
  .select()
  .single();
```

### UPDATE (modifier)
```tsx
const { error } = await supabase
  .from('players')
  .update({ is_alive: false })
  .eq('id', playerId);
```

### DELETE (supprimer)
```tsx
const { error } = await supabase
  .from('votes')
  .delete()
  .eq('game_id', gameId);
```

---

## Filtres courants

```tsx
.eq('column', value)       // égal
.neq('column', value)      // différent
.gt('column', value)       // plus grand
.lt('column', value)       // plus petit
.in('column', [a, b, c])   // dans la liste
.is('column', null)        // est null
.order('column', { ascending: false })
.limit(10)
.single()                  // retourne un objet, pas un array
```

---

## Realtime - Subscriptions

Supabase permet de **s'abonner aux changements** de la base de données.

```tsx
// Écouter les changements sur 'players' pour un game
const channel = supabase
  .channel(`game:${gameCode}`)
  .on('postgres_changes', {
    event: '*',           // INSERT, UPDATE, DELETE ou *
    schema: 'public',
    table: 'players',
    filter: `game_id=eq.${gameId}`
  }, (payload) => {
    console.log('Changement:', payload);
    // payload.new = nouvelle donnée
    // payload.old = ancienne donnée
    // payload.eventType = 'INSERT' | 'UPDATE' | 'DELETE'
  })
  .subscribe();

// IMPORTANT: Cleanup
return () => {
  supabase.removeChannel(channel);
};
```

---

## Dans Moonfall (useGameRealtime.ts)

```tsx
useEffect(() => {
  const channel = supabase.channel(`game:${game.code}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'games',
      filter: `id=eq.${game.id}`
    }, handleGameChange)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'players',
      filter: `game_id=eq.${game.id}`
    }, handlePlayerChange)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'votes',
      filter: `game_id=eq.${game.id}`
    }, handleVoteChange)
    .subscribe();
  
  return () => supabase.removeChannel(channel);
}, [game.id]);
```

---

## Types générés

Les types sont générés depuis le schéma DB :

```bash
npm run supabase:types
```

```tsx
// types/supabase.ts (généré)
export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: string;
          code: string;
          status: 'lobby' | 'jour' | 'nuit' | 'conseil' | 'terminee';
          // ...
        };
        Insert: { ... };
        Update: { ... };
      };
      players: { ... };
    };
  };
}
```

---

## Bonnes pratiques

1. **Toujours filtrer par `game_id`** → Évite les fuites de données
2. **Cleanup les subscriptions** → Évite les memory leaks
3. **Gérer les erreurs** → `if (error) { ... }`
4. **Régénérer les types** → Après chaque migration

---

*Suivant : [05-typescript.md](./05-typescript.md)*
