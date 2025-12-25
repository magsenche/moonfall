# Système de Missions - Game Design

> Document de conception pour le système de missions IRL de Moonfall.

## 🎯 Vision

Les missions sont le cœur de l'expérience IRL. Elles doivent :
- Forcer les interactions entre joueurs
- Créer du **drama** et des situations mémorables
- Donner un avantage stratégique aux gagnants
- Permettre aux loups de saboter subtilement

---

## ✅ État d'implémentation

| Fonctionnalité | Status |
|----------------|--------|
| Types de missions (individual, collective, competitive, auction) | ✅ Implémenté |
| Catégories (social, challenge, quiz, external, photo, auction) | ✅ Implémenté |
| Templates prédéfinis | ✅ En DB (`mission_templates` table) |
| Missions custom MJ | ✅ Implémenté |
| Système d'enchères (auction) | ✅ Implémenté |
| Timer avec deadline | ✅ Implémenté |
| Soumission de score | ✅ Implémenté |
| Auto-validation (first_wins, best_score) | ✅ Implémenté |
| **Système de points** | ✅ **Implémenté** (difficulté 1-5⭐ = 2-10 pts) |
| **Shop de pouvoirs** | ✅ **Implémenté** (6 pouvoirs achetables) |
| **Support Mode Auto-Garou** | ✅ **Implémenté** (collective, competitive, auction) |
| **Auto-refresh Wallet/Shop** | ✅ **Implémenté** (après gain de points) |
| Missions collectives (succès/échec village) | ⚠️ Partiel (validation MJ uniquement) |
| Variables dans énoncés ({player_name}) | ❌ À faire |

---

## 📋 Types de Missions

### 1. Missions Individuelles (`individual`)
Un joueur assigné doit accomplir une tâche.

| Catégorie | Exemples | Validation |
|-----------|----------|------------|
| **Social** | "Fais rire 3 personnes différentes" | MJ |
| **Défi IRL** | "Chante le refrain d'une chanson devant tout le monde" | MJ |
| **Photo** | "Selfie avec 3 joueurs qui ne sont pas à côté de toi" | Upload |

### 2. Missions Collectives (`collective`)
Le village doit réussir ensemble. Les loups essaient de faire capoter.

| Type | Exemple | Sabotage possible |
|------|---------|-------------------|
| **Consensus** | "Tout le monde doit lever la main en même temps" | Loup rate exprès |
| **Chaîne** | "Chaque joueur dit un mot, formez une phrase cohérente" | Loup casse la logique |
| **Quiz collectif** | "5 bonnes réponses consécutives" | Mauvaise réponse volontaire |

### 3. Missions Compétitives (`competitive`)
Course contre les autres joueurs. Premier validé ou meilleur score gagne.

| Type | Validation | Exemple |
|------|------------|---------|
| **first_wins** | Premier à soumettre | "Premier à trouver quelqu'un qui porte du bleu" |
| **best_score** | Meilleur score | "Mini-jeu externe - meilleur score gagne" |
| **mj** | MJ décide | "Meilleure imitation" |

### 4. Missions Enchères (`auction`) ⭐ Nouveau
Les joueurs enchérissent sur un défi. Le plus offrant doit le réaliser.

| Exemple | Fonctionnement |
|---------|----------------|
| "Citer X capitales européennes" | Joueurs enchérissent → "Je peux en citer 5!" → "Moi 7!" → Gagnant doit réussir |
| "Faire X pompes" | Enchères montantes → Gagnant exécute devant tous |

**Flow technique :**
1. MJ crée mission auction avec min/max enchère
2. Tous les joueurs vivants sont auto-assignés
3. Phase d'enchères (POST `/bid`)
4. MJ ferme les enchères (PATCH `/bid` avec `close_bidding`)
5. Plus offrant réalise le défi IRL
6. MJ valide succès ou échec (PATCH `/bid` avec `declare_winner` ou `declare_failure`)

---

## 🤖 Missions en Mode Auto-Garou

En mode **Auto-Garou** (partie sans MJ dédié), les missions sont disponibles avec certaines restrictions :

### Types autorisés

| Type | Disponible | Raison |
|------|------------|--------|
| `collective` | ✅ Oui | Tout le village participe ensemble |
| `competitive` | ✅ Oui | Auto-assignée à tous les joueurs |
| `auction` | ✅ Oui | Enchères ouvertes à tous |
| `individual` | ❌ Non | Nécessite assignation manuelle |

### Validations autorisées

| Validation | Disponible | Raison |
|------------|------------|--------|
| `mj` | ✅ Oui | Le créateur (qui joue) peut valider |
| `first_wins` | ✅ Oui | Auto-validation |
| `best_score` | ✅ Oui | Auto-validation |
| `auto` | ✅ Oui | Auto-validation |
| `upload` | ❌ Non | Nécessite validation MJ |
| `external` | ❌ Non | Nécessite validation MJ |

### Comportement

- Le **créateur de partie** (MJ) joue comme un joueur normal : il peut voter, enchérir, utiliser le shop
- Le MJ conserve ses pouvoirs de gestion : valider missions, passer les phases, clôturer enchères
- Les missions **compétitives** sont automatiquement assignées à tous les joueurs vivants
- L'UI n'affiche pas la section d'assignation manuelle des joueurs
- Un message informatif explique les restrictions du mode Auto-Garou

---

## 🏆 Système de Points & Shop

### Économie de points

Les missions récompensent les joueurs avec des **points** basés sur leur difficulté :

| Difficulté | Étoiles | Points gagnés |
|------------|---------|---------------|
| 1 | ⭐ | 2 pts |
| 2 | ⭐⭐ | 4 pts |
| 3 | ⭐⭐⭐ | 6 pts |
| 4 | ⭐⭐⭐⭐ | 8 pts |
| 5 | ⭐⭐⭐⭐⭐ | 10 pts |

Le MJ choisit la difficulté lors de la création de la mission.

### Shop de pouvoirs

Les joueurs peuvent dépenser leurs points dans le **Shop** pour acheter des pouvoirs :

| Pouvoir | Coût | Effet | Limite |
|---------|------|-------|--------|
| 🛡️ **Immunité** | 20 pts | Ne peut pas être éliminé au prochain conseil | 1x/joueur |
| ✌️ **Vote Double** | 10 pts | Ton vote compte double au prochain conseil | 2x/joueur |
| 👁️ **Vision Loup** | 15 pts | Découvre si un joueur est loup ou villageois | 3x/joueur |
| 🎭 **Vote Anonyme** | 8 pts | Ton vote reste secret au prochain conseil | 2x/joueur |
| ❓ **Question MJ** | 5 pts | Pose une question oui/non au MJ | Illimité |
| 🤫 **Silence** | 12 pts | Un joueur ne peut plus parler pendant 2 min | 1x/joueur |

**Pouvoirs actifs automatiquement :**
- `immunity` et `double_vote` sont vérifiés lors de la résolution du vote conseil
- `wolf_vision` révèle immédiatement si la cible est loup ou non

### Tables DB

```sql
-- Items disponibles dans le shop (config globale)
shop_items (id, name, description, cost, effect_type, icon, max_per_player, ...)

-- Achats des joueurs
player_purchases (game_id, player_id, shop_item_id, cost_paid, used_at, result, ...)

-- Points sur les joueurs
players.mission_points INTEGER DEFAULT 0

-- Difficulté sur les missions
missions.difficulty INTEGER (1-5)
```

### Anciennes récompenses (deprecated)

L'ancien système `reward_type` (wolf_hint, immunity, etc.) est conservé en DB pour compatibilité mais **remplacé par le système de points + shop**.

---

## 🔧 Architecture Technique (Implémentée)

### Base de données

```sql
-- Table missions (étendue)
missions (
  id, game_id, title, description, status,
  
  -- Nouveaux champs v2
  mission_type: 'individual' | 'collective' | 'competitive' | 'auction',
  category: 'social' | 'challenge' | 'quiz' | 'external' | 'photo' | 'auction',
  validation_type: 'mj' | 'auto' | 'upload' | 'external' | 'first_wins' | 'best_score',
  
  external_url,           -- Lien vers mini-jeu externe
  time_limit_seconds,     -- Temps pour compléter
  
  reward_type: 'wolf_hint' | 'immunity' | 'double_vote' | 'extra_vision' | 'silence' | 'none',
  reward_data,            -- JSON avec détails
  
  is_template,            -- Template réutilisable
  template_id,            -- Référence au template source
  
  winner_player_id,       -- Gagnant (competitive/auction)
  auction_data,           -- JSON: { min_bid, max_bid, current_bid, leading_player_id, bidding_closed }
  sabotage_allowed,       -- Les loups peuvent saboter (collective)
  
  created_at, deadline
)

-- Participation individuelle (étendue)
mission_assignments (
  mission_id, player_id, status,
  submitted_at,
  submission_data,        -- JSON: { score, answer, photoUrl, ... }
  score,                  -- Score numérique (competitive)
  bid,                    -- Enchère (auction)
  validated_by_mj
)

-- Templates réutilisables (globaux)
mission_templates (
  id, title, description,
  mission_type, category, validation_type,
  time_limit_seconds, reward_type, reward_description,
  external_url, sabotage_allowed,
  is_global,              -- TRUE = visible par tous les MJ
  creator_id,             -- Pour templates personnels (futur)
  sort_order, is_active
)
```

### API Endpoints (Implémentés)

```
GET  /api/mission-templates                        -- Liste templates globaux (depuis DB)
GET  /api/games/[code]/missions                    -- Liste missions d'une partie
POST /api/games/[code]/missions                    -- MJ crée mission (depuis template ou custom)

GET  /api/games/[code]/missions/[id]/submit        -- Status soumission joueur
POST /api/games/[code]/missions/[id]/submit        -- Joueur soumet score/réponse

GET  /api/games/[code]/missions/[id]/bid           -- Status enchères
POST /api/games/[code]/missions/[id]/bid           -- Joueur enchérit
PATCH /api/games/[code]/missions/[id]/bid          -- MJ: close_bidding, declare_winner, declare_failure

PATCH /api/games/[code]/missions/[id]              -- MJ valide/annule mission
```

### Fichiers clés

```
src/lib/missions/
├── types.ts              -- Types, labels UI (templates en DB)
└── index.ts              -- Exports

src/lib/api/
└── games.ts              -- getMissionTemplates() + autres fonctions API

src/components/game/
├── mission-form.tsx      -- Formulaire MJ (charge templates depuis API)
└── mission-card.tsx      -- Affichage mission (timer, enchères, soumission, contrôles MJ)

src/app/api/games/[code]/missions/
├── route.ts              -- GET/POST missions
└── [missionId]/
    ├── route.ts          -- PATCH mission
    ├── submit/route.ts   -- Soumissions joueurs
    └── bid/route.ts      -- Enchères
```

---

## 🎮 Flux de jeu

### Mission Individuelle/Compétitive
```
1. MJ crée mission (template ou custom) via MissionForm
2. MJ assigne à un ou plusieurs joueurs
3. Joueurs voient la mission avec timer (MissionCard)
4. Joueur soumet score/réponse (POST /submit)
5. Auto-validation (first_wins/best_score) ou validation MJ
6. Gagnant déterminé → winner_player_id renseigné
```

### Mission Collective
```
1. MJ lance mission collective (sabotage_allowed = true optionnel)
2. Tous les joueurs voient l'objectif
3. Déroulement IRL (MJ observe)
4. MJ marque succès ou échec via MissionCard
5. Si succès → récompense attribuée manuellement
```

### Mission Enchères (Auction) ⭐
```
1. MJ crée mission auction (min_bid, max_bid optionnels)
2. Tous les joueurs vivants auto-assignés
3. Phase d'enchères : joueurs cliquent "Enchérir" (+1 au bid actuel)
4. UI affiche enchère courante et leader
5. MJ clique "Fermer enchères" → bidding_closed = true
6. Plus offrant doit réaliser le défi IRL
7. MJ clique "Réussi ✓" ou "Échoué ✗"
8. Mission terminée avec winner ou failed
```

---

## 🛡️ Anti-triche

| Problème | Solution |
|----------|----------|
| Recherche Google | Questions personnelles sur les joueurs présents |
| Temps illimité | Timer strict avec deadline, mission expire |
| Faux screenshot | MJ vérifie visuellement |
| Enchères infinies | max_bid configurable par MJ |

---

## 📝 Templates prédéfinis

**Templates stockés en base de données** dans la table `mission_templates`.

Pour ajouter/modifier : utiliser Supabase Dashboard ou une migration SQL.

Voir : `supabase/migrations/002_mission_templates.sql`

### Templates actuels (14)

| Catégorie | Templates |
|-----------|----------|
| **Social** | Compliment sincère, Allié improbable |
| **Challenge** | Imitation, Chant du village, Danse du loup |
| **Quiz** | Culture générale, Devine qui |
| **Auction** | Capitales du monde, Pompes, Apnée, Équilibre |
| **External** | Mini-jeu externe |
| **Photo** | Selfie de groupe, Photo mystère |

---

## À faire

- [ ] Notifications missions (quand créée/mise à jour)
- [ ] Variables dans énoncés ({player_name})
- [ ] Statistiques joueur (missions gagnées, points totaux)
- [ ] Pouvoirs ciblés dans l'UI (wolf_vision, silence avec sélection de cible)

---

*Document vivant - mis à jour le 25/12/2025*
