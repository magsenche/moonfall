# Système de Missions - Game Design

> Document de conception pour le système de missions IRL de Moonfall.

## 🎯 Vision

Les missions sont le cœur de l'expérience IRL. Elles doivent :
- Forcer les interactions entre joueurs
- Créer du **drama** et des situations mémorables
- Donner un avantage stratégique aux gagnants
- Permettre aux loups de saboter subtilement

---

## 📋 Types de Missions

### 1. Missions Individuelles
Chaque joueur reçoit une mission personnelle. Le premier à réussir (ou le meilleur) gagne.

| Catégorie | Exemples | Validation |
|-----------|----------|------------|
| **Social** | "Fais rire 3 personnes différentes" | MJ |
| **Défi IRL** | "Chante le refrain d'une chanson devant tout le monde" | MJ |
| **Observation** | "Découvre et annonce publiquement le métier de [X]" | MJ |
| **Infiltration** | "Vote contre quelqu'un que tu as défendu publiquement" | Auto |
| **Photo** | "Selfie avec 3 joueurs qui ne sont pas à côté de toi" | Upload |

### 2. Missions Collectives (Village)
Le village doit réussir ensemble. Les loups essaient de faire capoter.

| Type | Exemple | Sabotage possible |
|------|---------|-------------------|
| **Consensus** | "Tout le monde doit lever la main en même temps" | Loup rate exprès |
| **Chaîne** | "Chaque joueur dit un mot, formez une phrase cohérente" | Loup casse la logique |
| **Collaboration** | "Construisez une pyramide de verres" | Sabotage physique discret |
| **Quiz collectif** | "5 bonnes réponses consécutives" | Mauvaise réponse volontaire |

### 3. Missions Compétitives
Course contre les autres joueurs.

| Type | Exemple | Anti-triche |
|------|---------|-------------|
| **Énigme chronométrée** | Résous en premier | Timer visible, pas de retour |
| **Mini-jeu externe** | Lien vers jeu web, meilleur score gagne | Screenshot au MJ |
| **Question perso** | "Quelle est la couleur préférée de [X] ?" | Demander = interaction IRL |
| **Rapidité** | Premier à trouver [objet] dans la pièce | Physique |

---

## 🏆 Récompenses

| Récompense | Effet | Pour qui |
|------------|-------|----------|
| **Indice Loup** | MJ révèle "X n'est PAS un loup" ou "Il y a un loup parmi A, B, C" | Village |
| **Immunité** | Ne peut pas être éliminé au prochain conseil | Tous |
| **Vote Double** | Compte pour 2 voix au prochain conseil | Tous |
| **Vision** | Voyante : voir 2 rôles au lieu d'1 cette nuit | Voyante |
| **Résurrection** | Peut sauver un mort au prochain tour (si Sorcière) | Sorcière |
| **Silence** | Un joueur au choix ne peut pas parler pendant 2min | Stratégique |

---

## 🔧 Architecture Technique

### Base de données

```sql
-- Templates de missions (créés par MJ ou prédéfinis)
mission_templates (
  id, game_id, 
  type: 'individual' | 'collective' | 'competitive',
  category: 'social' | 'challenge' | 'quiz' | 'external' | 'photo',
  title, description,
  validation_type: 'mj' | 'auto' | 'upload' | 'external',
  external_url,           -- Lien vers mini-jeu externe
  time_limit_seconds,     -- Temps pour compléter (anti-triche)
  reward_type,            -- Type de récompense
  reward_data,            -- JSON avec détails
  target_players,         -- null = tous, ou liste d'IDs
  sabotage_allowed,       -- Les loups peuvent saboter
  created_at
)

-- Missions actives dans une partie
missions (
  id, game_id, template_id,
  status: 'pending' | 'active' | 'completed' | 'failed' | 'cancelled',
  started_at, completed_at,
  winner_player_id,       -- Qui a gagné (individual/competitive)
  result_data             -- JSON: scores, réponses, etc.
)

-- Participation individuelle
mission_assignments (
  mission_id, player_id,
  status: 'pending' | 'in_progress' | 'success' | 'failed',
  submitted_at,
  submission_data,        -- Réponse, photo URL, score...
  validated_by_mj
)
```

### API Endpoints

```
GET  /api/games/[code]/missions              -- Liste missions actives
POST /api/games/[code]/missions              -- MJ crée une mission
POST /api/games/[code]/missions/[id]/start   -- MJ lance la mission
POST /api/games/[code]/missions/[id]/submit  -- Joueur soumet sa réponse
POST /api/games/[code]/missions/[id]/validate -- MJ valide
POST /api/games/[code]/missions/[id]/complete -- MJ termine et attribue récompense
```

### UI Components

```
components/game/
├── missions/
│   ├── MissionCard.tsx          -- Affichage d'une mission
│   ├── MissionTimer.tsx         -- Countdown anti-triche
│   ├── MissionSubmit.tsx        -- Formulaire de soumission
│   ├── MissionQuiz.tsx          -- Énigme/Question
│   ├── MissionExternal.tsx      -- Iframe ou lien externe
│   ├── MissionPhoto.tsx         -- Upload photo
│   ├── MissionMJControls.tsx    -- Contrôles MJ
│   └── MissionReward.tsx        -- Animation récompense
```

---

## 🎮 Flux de jeu

### Mission Individuelle
```
1. MJ crée mission depuis template ou custom
2. MJ lance la mission → notification à tous
3. Joueurs voient timer + description
4. Joueur soumet (réponse/photo/score)
5. MJ valide ou système auto-valide
6. Premier validé = gagnant → récompense attribuée
7. Notification à tous du gagnant
```

### Mission Collective
```
1. MJ lance mission collective
2. Tous les joueurs voient l'objectif
3. Déroulement IRL (MJ observe)
4. MJ marque succès ou échec
5. Si succès → récompense au village (indice)
6. Si échec → rien ou avantage loups
```

### Mission Compétitive avec lien externe
```
1. MJ crée mission avec URL externe (ex: jeu de rapidité)
2. Mission lancée → tous reçoivent le lien
3. Timer démarre (ex: 2 minutes)
4. Joueurs jouent et screenshot leur score
5. MJ compare les scores
6. Meilleur score = gagnant
```

---

## 🛡️ Anti-triche

| Problème | Solution |
|----------|----------|
| Recherche Google | Questions personnelles sur les joueurs présents |
| Temps illimité | Timer strict, mission expire |
| Faux screenshot | MJ vérifie visuellement |
| Copier réponse | Réponses différentes par joueur (variables) |
| Sabotage trop évident | Les loups doivent être subtils (social) |

---

## 📝 Templates prédéfinis (v1)

### Individuelles
1. "Fais deviner un film à quelqu'un sans parler"
2. "Découvre l'âge exact d'un joueur et annonce-le"
3. "Convaincs quelqu'un de te donner son verre"
4. "Fais un compliment sincère à 3 personnes différentes"

### Collectives
1. "Le village doit chanter une chanson ensemble sans se tromper"
2. "Formez une chaîne où chacun dit le prénom de son voisin de droite"
3. "10 secondes de silence complet"

### Compétitives
1. "Premier à trouver quelqu'un qui porte du bleu"
2. "Énigme: Résolvez le rébus [image]"
3. "Mini-jeu: [lien] - meilleur score gagne"

---

## 🚀 Implémentation par phases

### Phase 1 : Base
- [ ] Nouveau schéma `mission_templates`
- [ ] CRUD templates par MJ
- [ ] UI création mission custom
- [ ] Validation MJ uniquement

### Phase 2 : Compétitif
- [ ] Timer missions
- [ ] Soumission réponse joueur
- [ ] Auto-validation (premier arrivé)
- [ ] Lien externe + screenshot

### Phase 3 : Avancé
- [ ] Templates prédéfinis
- [ ] Missions collectives
- [ ] Système de récompenses
- [ ] Variables dans les énoncés ({player_name}, etc.)

---

## Questions ouvertes

1. **Fréquence** : Une mission par phase ? Par heure ? À la demande du MJ ?
2. **Visibilité** : Les loups voient-ils les missions collectives avant ?
3. **Échec** : Que se passe-t-il si personne ne réussit une mission ?
4. **Stack de récompenses** : Peut-on cumuler plusieurs immunités ?

---

*Document vivant - à mettre à jour selon les retours de playtest*
