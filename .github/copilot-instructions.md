# Moonfall - Loup-Garou Grandeur Nature

> Application web pour jouer au Loup-Garou en conditions réelles, inspirée de l'émission de Fary et Panayotis sur Canal+.

## 🎯 Concept

Chaque joueur reçoit un rôle secret au début de la partie. Les participants accomplissent des missions dans la vraie vie, avec des conseils organisés à intervalles réguliers où des joueurs sont éliminés par vote.

---

## 📋 Spécifications Fonctionnelles

### Joueurs & Parties

- **Nombre de joueurs** : Configurable dans les settings (min/max)
- **Première partie test** : 20 joueurs
- **Durée** : Plusieurs jours (première partie = 2 jours)
- **Attribution des rôles** : Aléatoire au lancement de la partie

### Rôles Disponibles

> À définir précisément, mais prévoir un maximum de rôles classiques :

**Camp du Village :**
- Villageois (de base)
- Voyante (peut voir un rôle chaque nuit)
- Chasseur (tue quelqu'un en mourant)
- Sorcière (potion de vie + potion de mort)
- Cupidon (lie deux amoureux)
- Ancien (survit à une attaque de loup)
- Salvateur/Protecteur (protège un joueur la nuit)
- Petite fille (peut espionner les loups)
- Corbeau (accuse publiquement)
- ... (à compléter)

**Camp des Loups :**
- Loup-Garou (de base)
- Loup Blanc (loup solitaire, gagne seul)
- Loup Alpha (convertit un villageois)
- Grand Méchant Loup (double kill sous conditions)
- ... (à compléter)

**Camp Solitaire :**
- Joueur de Flûte (doit enchanter tout le monde)
- Ange (doit mourir au premier conseil)
- ... (à compléter)

### Missions

- **Types** : Photos, défis physiques, énigmes, interactions sociales
- **Création** : Par le MJ, en cours de partie, customisables selon le lieu
- **Validation** : Par le MJ ou automatique selon le type
- **Conséquences** :
  - ✅ Mission réussie → Avantage village (nouveau rôle, indice sur un loup...)
  - ❌ Mission échouée → Avantage loups
- **Objectif des loups** : Saboter discrètement les missions communes

### Conseils & Votes

- **Fréquence** : Configurable (toutes les heures, 2x/jour, etc.)
- **Type de vote** : Secret via l'app
- **Qui vote** : Tous les joueurs vivants
- **Élimination des loups** : Vote secret via l'app également (pas de réunion physique)
- **Ordre des pouvoirs** : Respecter l'ordre classique du Loup-Garou
  1. Cupidon (première nuit)
  2. Voyante
  3. Loups-Garous
  4. Sorcière
  5. etc.

### Maître du Jeu (MJ)

- **Interface dédiée** : Oui, séparée des joueurs
- **Pouvoirs** :
  - Créer/modifier/supprimer des missions
  - Voir tous les rôles
  - Valider les missions
  - Gérer les conseils
  - Pause/reprise de partie
  - Éliminer/ressusciter (cas exceptionnels)
  - Envoyer des notifications globales
- **TODO** : Définir plus précisément les fonctionnalités MJ

### Informations Joueur (Temps Réel)

- Son rôle et ses pouvoirs
- Liste des joueurs vivants/morts
- Missions en cours et leur statut
- Historique des conseils et votes
- Timer avant prochain conseil
- Notifications importantes

---

## 🛠 Spécifications Techniques

### Stack Technique

| Composant | Choix | Raison |
|-----------|-------|--------|
| **Frontend** | Next.js + React | SSR, Vercel-friendly |
| **Styling** | Tailwind CSS | Rapide, responsive |
| **Backend** | Next.js API Routes | Tout-en-un |
| **Database** | Supabase (PostgreSQL) | Gratuit, realtime, auth inclus |
| **Auth** | Supabase Auth | Gratuit, simple |
| **Realtime** | Supabase Realtime (WebSockets) | Intégré à Supabase |
| **Hébergement** | Vercel | Gratuit, simple |
| **Notifications** | À définir | Push/Email/SMS |

### Notifications

> Problématique : iOS nécessite autorisation + compte développeur payant pour push natif

**Options à explorer :**
1. **Web Push** (Service Workers) - Gratuit, marche sur Android/Desktop, limité sur iOS
2. **Email** (via Resend/SendGrid gratuit) - Fiable mais moins instantané
3. **SMS** (Twilio, payant) - Dernier recours
4. **PWA** - Progressive Web App pour se rapprocher d'une app native

**Événements à notifier :**
- Attribution du rôle
- Nouvelle mission
- Rappel de mission
- Début d'un conseil
- Résultat d'un vote
- Mort d'un joueur
- Victoire/Défaite

### Authentification

- **Méthode** : Email magic link OU simple code de partie + pseudo
- **Persistence** : Session longue durée (plusieurs jours sans reconnexion)
- **Sécurité** : Chaque joueur ne voit que ses propres infos

### Base de Données (Schéma préliminaire)

```
parties
  - id
  - code (pour rejoindre)
  - nom
  - status (lobby, en_cours, terminée)
  - settings (JSON: durée conseil, fréquence, etc.)
  - created_at

joueurs
  - id
  - partie_id
  - user_id
  - pseudo
  - role
  - is_alive
  - is_mj

missions
  - id
  - partie_id
  - titre
  - description
  - type
  - status (en_cours, réussie, échouée)
  - assigned_to (null = mission commune)
  - deadline

conseils
  - id
  - partie_id
  - numero
  - status (vote_en_cours, terminé)
  - eliminated_player_id

votes
  - id
  - conseil_id
  - voter_id
  - target_id
  - type (jour, nuit_loup, pouvoir_special)

pouvoirs_utilises
  - id
  - partie_id
  - joueur_id
  - pouvoir
  - cible_id
  - nuit_numero
```

---

## 🎨 UI/UX

### Pages principales

1. **Accueil** - Créer/Rejoindre une partie
2. **Lobby** - Attente des joueurs, settings MJ
3. **Dashboard Joueur** - Rôle, missions, timer, actions
4. **Conseil** - Interface de vote
5. **Dashboard MJ** - Vue d'ensemble, contrôles

### Design

- **Thème** : Sombre, ambiance mystérieuse/nocturne
- **Responsive** : Mobile-first (joueurs sur téléphone)
- **Accessibilité** : Contrastes suffisants, gros boutons

---

## 📅 Roadmap

### Phase 1 - MVP (Objectif : première partie test)
- [ ] Setup projet (Next.js, Supabase, Vercel)
- [ ] Auth basique (code partie + pseudo)
- [ ] Création de partie + lobby
- [ ] Attribution aléatoire des rôles :
  - Villageois
  - Loup-Garou
  - **Voyante** (1 rôle spécial minimum)
- [ ] Système de vote jour (élimination publique)
- [ ] Vote nuit des loups
- [ ] **Chat privé des loups** (temps réel)
- [ ] Pouvoir de la Voyante (voir un rôle par nuit)
- [ ] Affichage des vivants/morts
- [ ] Timer avant prochain conseil
- [ ] **Missions basiques** :
  - Création par le MJ
  - 1 type simple (ex: photo)
  - Validation manuelle par MJ
  - Conséquence succès/échec
- [ ] **Notifications** (Email + Web Push si possible)
  - Début de partie / rôle attribué
  - Nouvelle mission
  - Conseil imminent
  - Résultat vote / mort
- [ ] Interface MJ basique (voir rôles, créer missions, valider)

### Phase 2 - Rôles avancés
- [ ] Sorcière (potion vie + mort)
- [ ] Chasseur (tue en mourant)
- [ ] Cupidon + Amoureux
- [ ] Salvateur/Protecteur
- [ ] Autres rôles selon demande

### Phase 3 - Missions avancées
- [ ] Templates de missions réutilisables
- [ ] Types variés (photo, défi, énigme, social)
- [ ] Missions collectives
- [ ] Validation automatique (si applicable)
- [ ] Système de récompenses/pénalités évolué

### Phase 4 - Expérience Morts
- [ ] Système Fantôme (message cryptique)
- [ ] Scoring et classement
- [ ] Vue spectateur

### Phase 5 - Polish & Scale
- [ ] PWA complète
- [ ] Historique détaillé des parties
- [ ] Stats de fin de partie
- [ ] Amélioration UI/UX
- [ ] Performance et optimisations

---

### Communication Loups-Garous

- **Chat intégré** : Oui, chat privé dans l'app pour les loups
- **IRL** : Ils peuvent aussi se coordonner en vrai (on ne peut pas l'empêcher)
- **Historique** : Le chat est conservé pour le MJ (debug/arbitrage)

### Rôle des Morts (Spectateurs)

> Les morts ne doivent pas être exclus de l'expérience !

**Mécanismes retenus :**
- 👻 **Fantôme** : Peut envoyer UN indice cryptique par jour à un vivant (limité en caractères, validé par le MJ ?)
- 🏆 **Scoring** : Les morts accumulent des points pour un classement final
  - Points pour : bonne prédiction du gagnant, identification des loups, missions accomplies de son vivant, etc.

---

## ❓ Questions Ouvertes

1. **Notifications** : Quelle solution privilégier ? (Web Push, Email, autre ?)
2. **Missions collectives** : Comment gérer le vote de succès/échec ?
3. **Anti-triche** : Comment empêcher les joueurs de montrer leur écran ?
4. **Rôle des morts** : Quel mécanisme choisir parmi les options ?
5. **Rejoindre en cours** : Possible ou non ?

---

## 🔧 Conventions de Code

- **Langue du code** : Anglais
- **Langue UI** : Français
- **Framework** : Next.js 14+ (App Router)
- **State Management** : React Context + Supabase Realtime
- **Formatting** : Prettier + ESLint
- **Commits** : Conventional Commits (feat:, fix:, etc.)

---

## 🏗️ Architecture - Principes

### Scalabilité & Modularité

> L'application doit être facilement extensible sans toucher au code core.

**Principes clés :**
1. **Config-driven** : Maximum de paramètres en DB, pas en dur dans le code
2. **Plugin-like roles** : Chaque rôle est un module indépendant
3. **Event-driven** : Actions déclenchées par événements (flexible)
4. **Feature flags** : Activer/désactiver des fonctionnalités par partie

### Ce qui doit être en DB (pas en dur)

| Élément | Stockage | Pourquoi |
|---------|----------|----------|
| **Rôles** | Table `roles` | Ajouter des rôles sans déployer |
| **Pouvoirs** | Table `powers` | Définir les capacités par rôle |
| **Types de missions** | Table `mission_types` | Templates réutilisables |
| **Récompenses** | Table `rewards` | Conséquences missions |
| **Settings partie** | JSON dans `parties` | Configurable par MJ |
| **Textes/Descriptions** | Table `translations` | i18n future + éditable |
| **Phases de jeu** | Table `game_phases` | Ordre des tours configurable |

### Schéma DB enrichi

```sql
-- Configuration globale des rôles (pas spécifique à une partie)
roles
  - id
  - name (slug: "voyante", "loup_garou")
  - display_name ("Voyante", "Loup-Garou")
  - team (village, loups, solo)
  - description
  - icon
  - is_active (pour activer/désactiver)

-- Pouvoirs associés aux rôles
powers
  - id
  - role_id
  - name ("voir_role", "tuer", "proteger")
  - description
  - phase (nuit, jour, mort)
  - uses_per_game (null = illimité)
  - priority (ordre d'exécution)

-- Templates de missions réutilisables
mission_templates
  - id
  - name
  - description_template
  - type (photo, defi, enigme, social)
  - difficulty (1-5)
  - default_duration
  - validation_type (mj, auto, vote)
  - reward_on_success
  - penalty_on_failure

-- Récompenses/Pénalités possibles
rewards
  - id
  - type (reveal_role, extra_vote, protection, hint)
  - target (village, loups, player)
  - description
  - parameters (JSON)

-- Parties
parties
  - id
  - code
  - name
  - status (lobby, jour, nuit, conseil, terminee)
  - current_phase_id
  - settings (JSON)
  - created_at
  - started_at
  - ended_at

-- Joueurs dans une partie
players
  - id
  - game_id
  - user_id
  - pseudo
  - role_id
  - is_alive
  - is_mj
  - death_reason
  - death_at
  - ghost_powers_remaining (pour les morts)

-- Missions actives dans une partie
missions
  - id
  - game_id
  - template_id (nullable, si custom)
  - title
  - description
  - status (pending, in_progress, success, failed, cancelled)
  - assigned_to (null = collective)
  - deadline
  - validated_by
  - validated_at

-- Chat des loups
wolf_chat
  - id
  - game_id
  - player_id
  - message
  - created_at

-- Logs de toutes les actions (audit trail)
game_events
  - id
  - game_id
  - event_type
  - actor_id
  - target_id
  - data (JSON)
  - created_at
```

### Structure Code (Next.js)

```
src/
├── app/                    # App Router
│   ├── (auth)/            # Routes auth
│   ├── (game)/            # Routes jeu
│   ├── mj/                # Dashboard MJ
│   └── api/               # API Routes
├── components/
│   ├── ui/                # Composants génériques
│   ├── game/              # Composants jeu
│   └── mj/                # Composants MJ
├── lib/
│   ├── supabase/          # Client & helpers
│   ├── roles/             # Logique par rôle (modulaire)
│   │   ├── base.ts        # Interface commune
│   │   ├── voyante.ts
│   │   ├── loup-garou.ts
│   │   └── index.ts       # Registry
│   ├── game-engine/       # Logique de jeu
│   └── utils/
├── hooks/                  # Custom hooks
├── types/                  # TypeScript types
└── config/                 # Constantes (fallbacks uniquement)
```

### Pattern pour les Rôles (Extensible)

```typescript
// Chaque rôle implémente cette interface
interface RoleHandler {
  id: string;
  canAct: (phase: GamePhase, player: Player) => boolean;
  getActions: (player: Player, game: Game) => Action[];
  executeAction: (action: Action, game: Game) => Promise<GameEvent>;
  onDeath?: (player: Player, game: Game) => Promise<void>;
}

// Les handlers sont chargés dynamiquement depuis la DB
const roleRegistry = new Map<string, RoleHandler>();
```
