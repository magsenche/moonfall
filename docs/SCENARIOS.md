# 🧪 Runner de scénarios

> Validation automatisée de la logique de jeu via l'API, sans navigateur ni clics.

## Principe

Le runner (`scripts/scenarios.ts`) joue **tous les joueurs** d'une partie en
appelant l'API locale — l'identité d'un joueur est simplement son `playerId`.
Chaque scénario :

1. crée une partie de test (préfixe `🧪`) avec 8 joueurs et une **distribution
   de rôles forcée** via `settings.rolesDistribution` ;
2. démarre la partie, lit les rôles attribués (le tirage reste aléatoire : un
   scénario cible « les loups » ou « la voyante », jamais un joueur fixe) ;
3. déroule nuit → jour → conseil en secondes : les timers ne sont **jamais
   attendus**, on appelle directement les endpoints de résolution
   (`/vote/night/resolve`, `/vote/resolve`, `/phase`) ;
4. asserte des invariants à chaque étape (morts, sauvetages, cascades,
   conditions de victoire, unicité des pouvoirs).

Les parties se jouent en mode **Auto-Garou** (`autoMode: true`, défaut) : le
créateur (MJ) joue comme les autres et peut être ciblé.

## Lancer

```bash
# 1. Serveur dev (en session cloud : NODE_USE_ENV_PROXY=1 obligatoire)
NODE_USE_ENV_PROXY=1 npm run dev

# 2. Dans un autre terminal
npm run scenarios                       # tous les scénarios
npm run scenarios -- --only=sorciere    # un seul
npm run scenarios -- --list             # lister
npm run scenarios -- --keep             # conserver les parties de test
npm run scenarios -- --base=http://localhost:3001  # autre port
```

Sortie : une ligne `✅`/`❌` par scénario + résumé final ; code de sortie 1 si
au moins un échec. Les tests unitaires des fonctions pures de résolution
(`src/lib/game/resolution.test.ts`) se lancent avec `npm run test:unit`
(runner natif `node --test`, aucune dépendance).

## Couverture actuelle (33 scénarios)

| Scénario | Ce qui est validé |
|----------|-------------------|
| `vanilla-victoire-village` | Dévoration nocturne, élimination au conseil, victoire village quand tous les loups sont morts |
| `vanilla-victoire-loups` | Victoire loups à parité loups/non-loups |
| `loup-garou` | Un kill par nuit tant qu'un loup vit (3 nuits d'affilée, meute puis loup seul), résolution bloquée tant que la meute n'a pas toute voté (`canForce`), pas de loup contre loup, les morts ne votent plus et ne sont plus ciblables |
| `voyante` | Vision correcte du rôle, 1 sondage/nuit, réservé à la voyante |
| `sorciere` | Vision de la cible des loups, potion de vie qui sauve, potion de mort qui tue, chaque potion à usage unique |
| `chasseur` | Tir mortel à la mort, tir unique |
| `petite-fille` | Lecture du chat des loups, écriture interdite aux non-loups |
| `ancien` | Survit à la 1ère attaque des loups, meurt à la 2ème |
| `salvateur` | Protection contre l'attaque, interdiction de protéger la même cible deux nuits de suite |
| `cupidon` | Mort de chagrin de l'amoureux quand l'autre est dévoré ; désignation unique |
| `trublion` | Échange effectif des rôles, échange unique, la meute recomposée fonctionne |
| `assassin` | Kill silencieux de nuit, usage unique |
| `assassin-amoureux` | La cascade chagrin s'applique aussi à un assassinat |
| `chasseur-amoureux` | La cascade chagrin s'applique aussi au tir du chasseur |
| `enfant-sauvage` | Transformation en loup à la mort du modèle, chasse avec la meute |
| `pret-collectif` | « Prêt » collectif : unanimité des humains vivants (bots exclus) → le dernier prêt déclenche la transition côté serveur, immédiatement (nuit résolue, jour → conseil, conseil résolu + cible éliminée) ; loup non-voté et conseil non-voté refusés ; rétractation ; réservé à l'Auto-Garou |
| `intuition` | Action de nuit des non-loups : pose/changement/restauration, interdite aux loups, aux morts, de jour et sur soi-même ; sans effet sur la résolution ; titre « Flair du village » au récap |
| `recap` | Chronique narrative de fin (dévorations, conseils, victoire) + titres, refusée (400) tant que la partie est en cours |
| `resolution-concurrente` | Verrou de résolution : deux resolve simultanés (nuit puis conseil) → un seul passe (409 pour l'autre), une seule victime |
| `partie-classique` | Préréglage Classique : composition starter (2🐺 1🔮 1🧙 1🔫 3👨‍🌾 à 8 joueurs), missions et boutique verrouillées côté API, partie jouable |
| `missions-points` | Compétitives `first_wins`/`best_score` : vainqueur, points crédités (difficulté ×2 × multiplicateur de rôle), soumission unique, non-assigné refusé |
| `missions-collective` | Tout le village crédité à la validation MJ (loup ×1, villageois ×1.5), échec sans points, création réservée au MJ |
| `missions-encheres` | Min/max/surenchère, fermeture MJ, enchère refusée après fermeture, vainqueur crédité, échec sans points |
| `boutique` | Solde et déduction, `max_per_player`, achat interdit aux morts, vision loup (usage unique), vote double et vote anonyme au conseil, immunité qui annule l'élimination |
| `avatar` | Choix d'avatar au lobby : emoji de la grille persisté dans `players.avatar_url`, emoji hors grille refusé (400), changement verrouillé une fois la partie lancée, l'avatar choisi survit au démarrage |
| `proces` | Procès d'avant-partie : accusation secrète au lobby (`votes` phase 0), upsert sans doublon, auto-accusation refusée, MJ arbitre exclu en mode manuel mais accusateur en Auto-Garou, tribunal fermé après le start, verdict « Délit de faciès » au récap (coupable 🐺 / innocenté 🐑), sans polluer « Flair du village » |
| `partie-mj-bots` | Partie réelle MJ arbitre + 7 bots : les loups bots votent **dès l'entrée de chaque nuit** (compteur plein sans humain), résolutions nuit/conseil sans forcer, MJ jamais ciblé, partie jouée jusqu'à la victoire sans blocage |
| `bots-pouvoirs` | Pouvoirs tenus par des bots (MJ arbitre + 8 bots : 2🐺, salvateur, cupidon, enfant sauvage, sorcière, chasseur) : couple, modèle et protection créés **dès l'entrée de la nuit 1**, meute 2/2, partie complète sans blocage malgré sauvetages et tirs |
| `meute-mixte` | Le loup HUMAIN décide : la meute bot se rallie à sa cible dès son vote (et la résolution dévore bien sa cible), même en minorité face aux bots |
| `recap-conseil` | Récap du conseil persisté (`council_results`) et servi à tous via GET /council-recap : éliminé, phase, votes détaillés et nommés (masqués si anonymes), null avant le premier conseil |
| `narration` | Rideau de narration (GET /narration) : un narrateur à personnalité attitré par partie (Corbeau / Commère / Aubergiste / Garde-Champêtre, stable du début à la fin), nuit 1 = présentation du narrateur + endormissement, le jour annonce la victime et son rôle, le conseil ouvre en une ligne, la nuit suivante rappelle le verdict du bûcher ET le narrateur le commente (coupable vs bavure) |
| `partie-mixte-bots` | MJ arbitre + 2 humains + 5 bots (config du bug rapporté) : bots déjà votés à l'entrée, résolution bloquée tant qu'un loup humain n'a pas voté (400 canForce), conseil mixte résolu |
| `temps-ecoule` | Expiration du timer : nuit expirée sans vote → resolve forcé, jour sans victime ; jour expiré → conseil ; conseil expiré à un seul vote → élimination et nuit suivante (phase incrémentée) ; **lazy tick** : une simple lecture de l'état (GET) fait avancer une phase expirée côté serveur — le cas « tous les téléphones verrouillés » |

Le financement des joueurs dans les scénarios boutique passe par le helper
`fundPlayer` (missions compétitives difficulté 5 validées par le MJ, +10 pts de
base pièce). Pas encore couvert : mode Infini, effet `silence`/`role_change`.

## Ajouter un scénario

Dans `scripts/scenarios.ts`, ajouter une entrée au registre `scenarios` :

```ts
'mon-scenario': async ({ newGame, log }) => {
  // 8 joueurs, distribution par NOM de rôle (doit sommer à 8)
  const g = await newGame('mon scenario', 8, { loup_garou: 2, voyante: 1, villageois: 5 });

  const seer = g.oneByRole('voyante');   // s'adapte au tirage aléatoire
  const wolf = g.wolves()[0];

  await g.nightKill(g.plainVillagers()[0].id);  // nuit complète (votes loups + resolve)
  const council = await g.councilKill(wolf.id); // jour → conseil → votes → resolve
  check(council.eliminated?.id === wolf.id, 'message d\'échec explicite');
  log('étape validée ✓');
},
```

Boîte à outils du `GameClient` : `byRole/oneByRole/wolves/plainVillagers/alive`
(état vivant), `wolfVote/resolveNight/toCouncil/councilVote/resolveCouncil`
(actions fines), `nightKill/councilKill` (raccourcis), `refresh/player/expectStatus`
(assertions d'état). Les pouvoirs s'appellent directement via `api('POST',
`/api/games/${g.code}/power/...`, {...})` + `checkStatus`.

Règles :

- **Déterminisme** : faire voter tous les loups (ou tous les joueurs) sur la
  même cible ; éviter les égalités non voulues.
- **S'adapter au tirage** : ne jamais présumer du rôle d'un joueur donné (y
  compris le MJ, qui joue en Auto-Garou) ; sélectionner par rôle après `start`.
- **Fail loud** : chaque `check` porte un message qui suffit à comprendre
  l'échec sans relire le code.

## Environnement & limites

- **Rate-limit** : l'API limite créations/joins par IP ; le runner envoie un
  `x-forwarded-for` unique par joueur virtuel pour simuler 8 appareils.
- **Référentiel rôles** : lu une fois en lecture seule via Supabase REST
  (`NEXT_PUBLIC_SUPABASE_*`, env ou `.env.local`) car l'API n'expose pas la
  table `roles`. Si un rôle manque en DB, le scénario échoue explicitement.
- **Nettoyage** : les parties de test sont marquées `terminee` en fin de run.
  La RLS anonyme n'autorise pas le `DELETE` sur `games` : la suppression réelle
  (cascade) n'a lieu que si `SUPABASE_SERVICE_ROLE_KEY` est présent (local).
- **Sessions cloud** : le runner n'utilise pas Realtime (pur REST/polling), il
  fonctionne donc entièrement derrière le proxy egress. Seul prérequis :
  lancer le dev server avec `NODE_USE_ENV_PROXY=1`.

---

*Dernière mise à jour : 19/08/2026*
