# ♾️ Mode Loup-Garou Infini

> Mode de jeu révolutionnaire où **personne ne reste sur le banc** - les morts reviennent avec un nouveau rôle !

## 🎯 Concept

Le problème classique du Loup-Garou : **les joueurs éliminés s'ennuient** pendant que les autres continuent.

**Solution** : Quand tu meurs, tu reviens au tour suivant avec un **nouveau rôle aléatoire**. Ton équipe peut changer ! La victoire est **individuelle par points**.

---

## ⚙️ Mécaniques

### Respawn

| Événement | Ce qui se passe |
|-----------|-----------------|
| Mort par vote (conseil) | Rôle révélé, joueur "mort" jusqu'au prochain tour |
| Mort par loups (nuit) | Rôle révélé, joueur "mort" jusqu'au prochain tour |
| Début du tour suivant | Tous les morts reviennent avec un **nouveau rôle aléatoire** |

### Changement d'équipe

- Un joueur peut être Villageois au tour 1, puis Loup-Garou au tour 3
- Les points sont **individuels**, pas par équipe
- Chaque "vie" compte séparément pour les points

### Condition de victoire

La partie se termine par :
1. **Timer** : Durée fixe (ex: 45min, 1h, 1h30)
2. **Score cible** : Premier à atteindre X points
3. **Nombre de tours** : Après X cycles jour/nuit

**Gagnant** = Joueur avec le plus de points

---

## 🏆 Système de Points

### Actions Village

| Action | Points | Condition |
|--------|--------|-----------|
| Voter pour éliminer un Loup | +3 | Le joueur éliminé était loup |
| Survivre à un conseil (accusé) | +2 | Tu avais des votes mais pas éliminé |
| Utiliser pouvoir efficacement | +2 | Voyante trouve un loup, Sorcière sauve, etc. |
| Mission réussie | +2 à +10 | Selon difficulté |

### Actions Loups

| Action | Points | Condition |
|--------|--------|-----------|
| Tuer un rôle spécial (nuit) | +4 | Voyante, Sorcière, Chasseur... |
| Tuer un Villageois simple | +2 | Victime était villageois |
| Ne pas être éliminé au conseil | +1 | Par tour où tu survis |
| Autre loup élimine un rôle spécial | +1 | Bonus d'équipe |

### Malus

| Action | Points | Condition |
|--------|--------|-----------|
| Mourir (vote ou nuit) | -1 | Tu meurs |
| Voter pour un villageois | -1 | Le joueur éliminé était village |

### Points passifs

| Action | Points | Condition |
|--------|--------|-----------|
| Survivre un tour complet | +1 | Jour + Nuit sans mourir |

---

## 🔧 Implémentation technique

### Nouveaux champs DB

```sql
-- Settings de partie
games.settings = {
  ...existingSettings,
  infiniteMode: true,
  infiniteModeConfig: {
    endCondition: 'timer' | 'score' | 'turns',
    timerMinutes: 60,        -- si timer
    targetScore: 50,         -- si score
    maxTurns: 10,            -- si turns
  }
}

-- Points individuels (existe déjà !)
players.mission_points  -- On réutilise ce champ pour le score total

-- Historique des vies (nouveau)
player_lives (
  id UUID,
  game_id UUID,
  player_id UUID,
  life_number INT,         -- 1, 2, 3...
  role_id UUID,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  death_reason TEXT,       -- 'vote', 'wolves', 'hunter', etc.
  points_earned INT
)
```

### Nouveaux événements

```typescript
// game_events.event_type
'player_respawned'      // Joueur revient avec nouveau rôle
'points_earned'         // Points gagnés (data: { playerId, amount, reason })
'infinite_game_ended'   // Fin de partie mode infini (data: { rankings })
```

### Logique de respawn

```typescript
// À la fin de chaque tour (après résolution nuit)
async function processRespawns(gameId: string) {
  // 1. Récupérer tous les joueurs morts
  const deadPlayers = await getDeadPlayers(gameId);
  
  // 2. Pour chaque mort, assigner un nouveau rôle
  for (const player of deadPlayers) {
    const newRole = await getRandomAvailableRole(gameId);
    
    // 3. Enregistrer l'ancienne vie
    await savePlayerLife(player);
    
    // 4. Réinitialiser le joueur
    await supabase.from('players').update({
      role_id: newRole.id,
      is_alive: true,
      death_reason: null,
      death_at: null,
    }).eq('id', player.id);
    
    // 5. Notifier
    await createGameEvent('player_respawned', {
      playerId: player.id,
      oldRole: player.role_id,
      newRole: newRole.id,
    });
  }
}
```

### UI spécifique

1. **Leaderboard** en temps réel (toujours visible)
2. **Badge "Nouvelle vie"** quand on respawn
3. **Historique des vies** consultable
4. **Timer de partie** (si mode timer)
5. **Score cible** affiché (si mode score)

---

## 🎮 Flow de jeu

```
LOBBY
  ↓
[Distribution initiale des rôles]
  ↓
┌─────────────────────────────────┐
│         BOUCLE INFINIE          │
│                                 │
│  JOUR → CONSEIL → NUIT          │
│     ↓                           │
│  [Résolution: morts révélés]    │
│     ↓                           │
│  [Points attribués]             │
│     ↓                           │
│  [Respawn des morts]            │
│     ↓                           │
│  [Check condition de fin]       │
│     ↓                           │
│  Si pas fini → Retour JOUR      │
└─────────────────────────────────┘
  ↓
FIN DE PARTIE
  ↓
[Classement final + stats]
```

---

## 📊 Équilibrage

### Ratio des rôles au respawn

Pour éviter trop de loups ou pas assez :

```typescript
function getRandomAvailableRole(gameId: string) {
  const alivePlayers = await getAlivePlayers(gameId);
  const wolves = alivePlayers.filter(p => p.role.team === 'loups');
  
  // Ratio cible: ~25% loups
  const targetWolfRatio = 0.25;
  const currentRatio = wolves.length / alivePlayers.length;
  
  if (currentRatio < targetWolfRatio) {
    // Favoriser loup
    return weightedRandom([
      { role: 'loup-garou', weight: 40 },
      { role: 'villageois', weight: 30 },
      { role: 'special', weight: 30 },
    ]);
  } else {
    // Favoriser village
    return weightedRandom([
      { role: 'villageois', weight: 40 },
      { role: 'special', weight: 40 },
      { role: 'loup-garou', weight: 20 },
    ]);
  }
}
```

### Rôles spéciaux en respawn

Certains rôles n'ont pas de sens en respawn :
- ❌ **Cupidon** (agit au début de partie seulement)
- ✅ **Voyante** (peut être réassignée)
- ✅ **Chasseur** (peut être réassigné)
- ✅ **Sorcière** (respawn avec potions pleines ? ou vides ?)
- ✅ **Petite Fille** (peut être réassignée)

---

## ✅ À implémenter

### Phase 1 : Base
- [ ] Setting `infiniteMode` dans création de partie
- [ ] UI config mode infini (timer/score/tours)
- [ ] Logique de respawn après résolution nuit
- [ ] Attribution nouveau rôle aléatoire

### Phase 2 : Points
- [ ] Système de points par action
- [ ] Tracking dans `game_events`
- [ ] Attribution automatique après chaque action
- [ ] Leaderboard temps réel

### Phase 3 : Fin de partie
- [ ] Condition de fin (timer/score/tours)
- [ ] Écran de classement final
- [ ] Stats par joueur (vies, rôles joués, points par action)

### Phase 4 : Polish
- [ ] Notifications respawn
- [ ] Animations "nouvelle vie"
- [ ] Historique des vies consultable
- [ ] Équilibrage des points après tests

---

## 🤔 Questions ouvertes

1. **Sorcière respawn** : Récupère ses potions ou non ?
2. **Amoureux** : Si l'un meurt et respawn, sont-ils encore amoureux ?
3. **Points négatifs** : Trop punitif ou nécessaire pour l'équilibre ?
4. **Missions** : Disponibles en mode infini ou trop complexe ?
5. **Shop** : Pertinent ou remplacé par le système de points ?

---

*Document créé le 25/12/2025 - À affiner après les premiers tests*
