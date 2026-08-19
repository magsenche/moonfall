/**
 * Runner de scénarios API — valide la logique de jeu sans navigateur.
 *
 * Le script joue tous les joueurs d'une partie en appelant l'API locale :
 * chaque joueur est identifié par son playerId, les timers ne sont jamais
 * attendus (on appelle directement les endpoints de résolution).
 *
 * Prérequis : serveur dev lancé (`npm run dev`, en session cloud
 * `NODE_USE_ENV_PROXY=1 npm run dev`) et variables NEXT_PUBLIC_SUPABASE_*
 * disponibles (env ou .env.local).
 *
 * Usage :
 *   npm run scenarios                     # tous les scénarios
 *   npm run scenarios -- --only=sorciere  # un seul scénario
 *   npm run scenarios -- --list           # lister les scénarios
 *   npm run scenarios -- --keep           # ne pas clore les parties de test
 *
 * Voir docs/SCENARIOS.md pour ajouter un scénario.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration & environnement
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = (name: string): string | boolean => {
  const hit = args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return false;
  const eq = hit.indexOf('=');
  return eq === -1 ? true : hit.slice(eq + 1);
};

const BASE_URL = typeof flag('base') === 'string' ? String(flag('base')) : 'http://localhost:3000';
const ONLY = typeof flag('only') === 'string' ? String(flag('only')) : null;
const KEEP_GAMES = flag('keep') === true;
const LIST_ONLY = flag('list') === true;

/** Charge une variable d'env, avec fallback sur .env.local (parse minimal KEY=VALUE). */
let dotEnvCache: Record<string, string> | null = null;
function envVar(name: string): string {
  if (process.env[name]) return process.env[name];
  if (!dotEnvCache) {
    dotEnvCache = {};
    try {
      const raw = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
      for (const line of raw.split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
        if (m) dotEnvCache[m[1]] = m[2];
      }
    } catch {
      // pas de .env.local — on ne compte que sur process.env
    }
  }
  const value = dotEnvCache[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name} (ni dans l'env, ni dans .env.local)`);
  }
  return value;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP helpers
// ─────────────────────────────────────────────────────────────────────────────

interface ApiResponse<T> {
  status: number;
  data: T;
}

/** Compteur global pour attribuer une IP virtuelle unique par joueur simulé
 * (le rate-limit de l'API est par IP ; le runner simule des appareils distincts). */
let virtualIpCounter = 0;
function nextVirtualIp(): string {
  virtualIpCounter++;
  return `10.99.${Math.floor(virtualIpCounter / 250)}.${(virtualIpCounter % 250) + 1}`;
}

async function api<T = Record<string, unknown>>(
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(headers ?? {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data: data as T };
}

// ─────────────────────────────────────────────────────────────────────────────
// Assertions
// ─────────────────────────────────────────────────────────────────────────────

class ScenarioFailure extends Error {}

function check(cond: unknown, message: string): asserts cond {
  if (!cond) throw new ScenarioFailure(message);
}

function checkStatus<T>(res: ApiResponse<T>, expected: number, context: string): T {
  if (res.status !== expected) {
    throw new ScenarioFailure(
      `${context} : HTTP ${res.status} attendu ${expected} — ${JSON.stringify(res.data)}`
    );
  }
  return res.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types de l'API
// ─────────────────────────────────────────────────────────────────────────────

interface RoleRow {
  id: string;
  name: string;
  team: 'village' | 'loups' | 'solo';
}

interface PlayerRow {
  id: string;
  pseudo: string;
  is_alive: boolean;
  is_mj: boolean;
  role_id: string | null;
}

interface GameRow {
  id: string;
  code: string;
  status: string;
  current_phase: number | null;
  players: PlayerRow[];
}

interface NightResolveResponse {
  success?: boolean;
  victim?: string;
  victimRole?: string;
  gameOver?: boolean;
  winner?: string;
  elderSaved?: boolean;
  salvateurSaved?: boolean;
  witchSaved?: boolean;
  poisonVictim?: boolean;
  message?: string;
  error?: string;
}

interface CouncilResolveResponse {
  success?: boolean;
  eliminated?: { id: string; pseudo: string; role: string; team: string } | null;
  gameOver?: boolean;
  winner?: string;
  tie?: boolean;
  error?: string;
}

/** Joueur enrichi de son rôle courant (vision omnisciente du runner). */
interface Player extends PlayerRow {
  role: RoleRow | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rôles (référentiel lu une fois via Supabase REST — lecture seule)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchRoles(): Promise<Map<string, RoleRow>> {
  const url = envVar('NEXT_PUBLIC_SUPABASE_URL');
  const key = envVar('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  const res = await fetch(`${url}/rest/v1/roles?select=id,name,team&is_active=eq.true`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    throw new Error(`Lecture du référentiel des rôles impossible : HTTP ${res.status}`);
  }
  const rows = (await res.json()) as RoleRow[];
  return new Map(rows.map((r) => [r.name, r]));
}

// ─────────────────────────────────────────────────────────────────────────────
// GameClient : pilote une partie complète via l'API
// ─────────────────────────────────────────────────────────────────────────────

const PLAYER_NAMES = ['Aline', 'Basile', 'Chloe', 'Damien', 'Elise', 'Fabien', 'Gaelle', 'Hector'];

class GameClient {
  code = '';
  mjId = '';
  private state: GameRow | null = null;
  private rolesByName: Map<string, RoleRow>;

  constructor(rolesByName: Map<string, RoleRow>) {
    this.rolesByName = rolesByName;
  }

  private get rolesById(): Map<string, RoleRow> {
    return new Map([...this.rolesByName.values()].map((r) => [r.id, r]));
  }

  roleId(name: string): string {
    const role = this.rolesByName.get(name);
    if (!role) {
      throw new ScenarioFailure(`Rôle absent du référentiel DB : ${name}`);
    }
    return role.id;
  }

  /** Crée une partie de test et fait rejoindre nPlayers joueurs (MJ inclus). */
  async create(name: string, nPlayers: number): Promise<void> {
    const created = checkStatus(
      await api<{ code: string; playerId: string }>(
        'POST',
        '/api/games',
        { name: `🧪 ${name}`, pseudo: PLAYER_NAMES[0] },
        { 'x-forwarded-for': nextVirtualIp() }
      ),
      200,
      'Création de partie'
    );
    this.code = created.code;
    this.mjId = created.playerId;

    for (let i = 1; i < nPlayers; i++) {
      checkStatus(
        await api(
          'POST',
          `/api/games/${this.code}/join`,
          { pseudo: PLAYER_NAMES[i] },
          { 'x-forwarded-for': nextVirtualIp() }
        ),
        200,
        `Join de ${PLAYER_NAMES[i]}`
      );
    }
  }

  /** Configure la distribution des rôles par NOM de rôle (ex: { loup_garou: 2, villageois: 6 }). */
  async configureRoles(distribution: Record<string, number>): Promise<void> {
    const byId: Record<string, number> = {};
    for (const [name, count] of Object.entries(distribution)) {
      byId[this.roleId(name)] = count;
    }
    checkStatus(
      await api('PATCH', `/api/games/${this.code}/settings`, {
        playerId: this.mjId,
        settings: { rolesDistribution: byId, autoMode: true },
      }),
      200,
      'Configuration des rôles'
    );
  }

  async start(): Promise<void> {
    checkStatus(await api('POST', `/api/games/${this.code}/start`), 200, 'Démarrage');
    await this.refresh();
  }

  async refresh(): Promise<GameRow> {
    this.state = checkStatus(
      await api<GameRow>('GET', `/api/games/${this.code}`),
      200,
      'Lecture de la partie'
    );
    return this.state;
  }

  get status(): string {
    check(this.state, 'Partie non chargée');
    return this.state.status;
  }

  get phase(): number {
    check(this.state, 'Partie non chargée');
    return this.state.current_phase ?? 1;
  }

  expectStatus(expected: string, context: string): void {
    check(
      this.status === expected,
      `${context} : statut ${expected} attendu, reçu ${this.status}`
    );
  }

  players(): Player[] {
    check(this.state, 'Partie non chargée');
    const roles = this.rolesById;
    return this.state.players.map((p) => ({
      ...p,
      role: p.role_id ? (roles.get(p.role_id) ?? null) : null,
    }));
  }

  alive(): Player[] {
    return this.players().filter((p) => p.is_alive);
  }

  player(id: string): Player {
    const found = this.players().find((p) => p.id === id);
    check(found, `Joueur introuvable : ${id}`);
    return found;
  }

  /** Joueurs vivants d'un rôle donné. */
  byRole(name: string): Player[] {
    return this.alive().filter((p) => p.role?.name === name);
  }

  oneByRole(name: string): Player {
    const found = this.byRole(name);
    check(found.length > 0, `Aucun joueur vivant avec le rôle ${name}`);
    return found[0];
  }

  wolves(): Player[] {
    return this.alive().filter((p) => p.role?.team === 'loups');
  }

  /** Villageois "sans pouvoir de nuit", pratiques comme victimes des loups. */
  plainVillagers(): Player[] {
    return this.byRole('villageois');
  }

  // ── Actions de jeu ─────────────────────────────────────────────────────────

  /** Tous les loups vivants votent la même cible. */
  async wolfVote(targetId: string): Promise<void> {
    for (const wolf of this.wolves()) {
      checkStatus(
        await api('POST', `/api/games/${this.code}/vote/night`, {
          visitorId: wolf.id,
          targetId,
        }),
        200,
        `Vote de nuit du loup ${wolf.pseudo}`
      );
    }
  }

  async resolveNight(): Promise<NightResolveResponse> {
    const data = checkStatus(
      await api<NightResolveResponse>('POST', `/api/games/${this.code}/vote/night/resolve`, {}),
      200,
      'Résolution de nuit'
    );
    await this.refresh();
    return data;
  }

  /** jour → conseil (les résolutions gèrent elles-mêmes nuit→jour et conseil→nuit). */
  async toCouncil(): Promise<void> {
    checkStatus(
      await api('POST', `/api/games/${this.code}/phase`, { phase: 'conseil' }),
      200,
      'Passage au conseil'
    );
    await this.refresh();
  }

  /** Fait voter des électeurs (tous les vivants par défaut) contre une cible. */
  async councilVote(targetId: string, voters?: Player[]): Promise<void> {
    for (const voter of voters ?? this.alive()) {
      checkStatus(
        await api('POST', `/api/games/${this.code}/vote`, {
          voterId: voter.id,
          targetId,
          voteType: 'jour',
        }),
        200,
        `Vote de ${voter.pseudo}`
      );
    }
  }

  async resolveCouncil(): Promise<CouncilResolveResponse> {
    const data = checkStatus(
      await api<CouncilResolveResponse>('POST', `/api/games/${this.code}/vote/resolve`, {}),
      200,
      'Résolution du conseil'
    );
    await this.refresh();
    return data;
  }

  /** Raccourci : nuit complète où les loups dévorent targetId. */
  async nightKill(targetId: string): Promise<NightResolveResponse> {
    check(this.status === 'nuit', `nightKill attendu en nuit, statut=${this.status}`);
    await this.wolfVote(targetId);
    return this.resolveNight();
  }

  /** Raccourci : conseil complet où tout le monde élimine targetId. */
  async councilKill(targetId: string): Promise<CouncilResolveResponse> {
    check(this.status === 'jour', `councilKill attendu en jour, statut=${this.status}`);
    await this.toCouncil();
    await this.councilVote(targetId);
    return this.resolveCouncil();
  }

  /** Marque la partie de test comme terminée (pas de DELETE anonyme en RLS). */
  async cleanup(): Promise<void> {
    if (!this.code) return;
    const url = envVar('NEXT_PUBLIC_SUPABASE_URL');
    const key = envVar('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (serviceKey) {
      // Suppression réelle (cascade) quand la clé service est disponible (local).
      const res = await fetch(`${url}/rest/v1/games?code=eq.${this.code}`, {
        method: 'DELETE',
        headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
      });
      if (res.ok) return;
      console.warn(`⚠️  DELETE ${this.code} refusé (HTTP ${res.status}), fallback statut terminee`);
    }

    const res = await fetch(`${url}/rest/v1/games?code=eq.${this.code}`, {
      method: 'PATCH',
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
        prefer: 'return=minimal',
      },
      body: JSON.stringify({ status: 'terminee' }),
    });
    if (!res.ok) {
      console.warn(`⚠️  Nettoyage de ${this.code} impossible : HTTP ${res.status}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Scénarios
// ─────────────────────────────────────────────────────────────────────────────

interface ScenarioContext {
  rolesByName: Map<string, RoleRow>;
  newGame: (name: string, nPlayers: number, distribution: Record<string, number>) => Promise<GameClient>;
  log: (message: string) => void;
}

type Scenario = (ctx: ScenarioContext) => Promise<void>;

const scenarios: Record<string, Scenario> = {
  /** Partie vanilla : le village élimine les 2 loups → victoire village. */
  'vanilla-victoire-village': async ({ newGame, log }) => {
    const g = await newGame('vanilla village', 8, { loup_garou: 2, villageois: 6 });

    const night1 = await g.nightKill(g.plainVillagers()[0].id);
    check(night1.victim !== undefined, 'Nuit 1 : une victime attendue');
    check(g.alive().length === 7, `7 vivants attendus après la nuit 1, ${g.alive().length} trouvés`);
    log(`nuit 1 : ${night1.victim} dévoré`);

    const wolf1 = g.wolves()[0];
    const council1 = await g.councilKill(wolf1.id);
    check(council1.eliminated?.id === wolf1.id, 'Conseil 1 : le loup visé doit être éliminé');
    check(council1.eliminated?.team === 'loups', 'Conseil 1 : le rôle révélé doit être loup');
    check(council1.gameOver === false, 'Conseil 1 : la partie continue (1 loup restant)');
    log(`conseil 1 : loup ${wolf1.pseudo} éliminé`);

    await g.nightKill(g.plainVillagers()[0].id);
    g.expectStatus('jour', 'Après la nuit 2');

    const wolf2 = g.wolves()[0];
    const council2 = await g.councilKill(wolf2.id);
    check(council2.gameOver === true, 'Conseil 2 : la partie doit se terminer');
    check(council2.winner === 'village', `Vainqueur village attendu, reçu ${council2.winner}`);
    g.expectStatus('terminee', 'Fin de partie');
    check(g.wolves().length === 0, 'Plus aucun loup vivant');
    log('victoire du village ✓');
  },

  /** Partie vanilla : les loups mangent le village → victoire loups. */
  'vanilla-victoire-loups': async ({ newGame, log }) => {
    const g = await newGame('vanilla loups', 8, { loup_garou: 2, villageois: 6 });

    // Le village vote "mal" (élimine un villageois), les loups dévorent chaque nuit.
    await g.nightKill(g.plainVillagers()[0].id); // 2 loups vs 5 villageois
    const council1 = await g.councilKill(g.plainVillagers()[0].id); // 2 vs 4
    check(council1.gameOver === false, 'Conseil 1 : la partie continue');

    await g.nightKill(g.plainVillagers()[0].id); // 2 vs 3
    const council2 = await g.councilKill(g.plainVillagers()[0].id); // 2 vs 2 → loups
    check(council2.gameOver === true, 'Conseil 2 : la partie doit se terminer (parité)');
    check(council2.winner === 'loups', `Vainqueur loups attendu, reçu ${council2.winner}`);
    g.expectStatus('terminee', 'Fin de partie');
    log('victoire des loups (parité loups/villageois) ✓');
  },

  /** Loup-garou : dévore chaque nuit tant qu'il est en vie, dans les règles de la meute. */
  'loup-garou': async ({ newGame, log }) => {
    const g = await newGame('loup garou', 8, { loup_garou: 2, villageois: 6 });
    const [wolf1, wolf2] = g.wolves();

    // Un loup ne peut pas dévorer un autre loup.
    const cannibal = await api('POST', `/api/games/${g.code}/vote/night`, {
      visitorId: wolf1.id,
      targetId: wolf2.id,
    });
    check(cannibal.status === 400, `Loup contre loup : 400 attendu, reçu ${cannibal.status}`);

    // Tant que toute la meute n'a pas voté, la résolution est refusée (sans force).
    const prey1 = g.plainVillagers()[0];
    checkStatus(
      await api('POST', `/api/games/${g.code}/vote/night`, { visitorId: wolf1.id, targetId: prey1.id }),
      200,
      'Vote du premier loup'
    );
    const partial = await api<{ voted?: number; total?: number; canForce?: boolean }>(
      'POST',
      `/api/games/${g.code}/vote/night/resolve`,
      {}
    );
    check(partial.status === 400, `Résolution avec meute incomplète : 400 attendu, reçu ${partial.status}`);
    check(partial.data.canForce === true, 'La résolution incomplète doit proposer canForce');
    await g.refresh();
    check(g.player(prey1.id).is_alive, 'Personne ne meurt tant que la meute n\'a pas résolu');
    log(`meute incomplète bloquée (${partial.data.voted}/${partial.data.total} votes)`);

    // Meute complète → la victime meurt.
    checkStatus(
      await api('POST', `/api/games/${g.code}/vote/night`, { visitorId: wolf2.id, targetId: prey1.id }),
      200,
      'Vote du second loup'
    );
    const night1 = await g.resolveNight();
    check(night1.victim !== undefined, 'Nuit 1 : une victime attendue');
    check(!g.player(prey1.id).is_alive, 'Nuit 1 : la proie doit être morte');
    log(`nuit 1 : ${prey1.pseudo} dévoré par la meute complète`);

    // Le conseil élimine un loup.
    await g.councilKill(wolf1.id);
    check(!g.player(wolf1.id).is_alive, 'Le loup visé au conseil doit être mort');

    // Nuit 2 : le loup mort ne vote plus.
    const deadVote = await api('POST', `/api/games/${g.code}/vote/night`, {
      visitorId: wolf1.id,
      targetId: g.plainVillagers()[0].id,
    });
    check(deadVote.status === 400, `Vote d'un loup mort : 400 attendu, reçu ${deadVote.status}`);

    // Une cible déjà morte est refusée.
    const deadTarget = await api('POST', `/api/games/${g.code}/vote/night`, {
      visitorId: wolf2.id,
      targetId: prey1.id,
    });
    check(deadTarget.status === 400, `Cible déjà morte : 400 attendu, reçu ${deadTarget.status}`);

    // Le loup survivant dévore seul, nuit après nuit.
    const prey2 = g.plainVillagers()[0];
    await g.nightKill(prey2.id);
    check(!g.player(prey2.id).is_alive, 'Nuit 2 : le loup survivant dévore seul');
    log(`nuit 2 : ${prey2.pseudo} dévoré par le loup restant`);

    await g.toCouncil();
    await g.resolveCouncil(); // conseil blanc

    const prey3 = g.plainVillagers()[0];
    const night3 = await g.nightKill(prey3.id);
    check(!g.player(prey3.id).is_alive, 'Nuit 3 : le loup dévore encore tant qu\'il est en vie');
    check(night3.gameOver !== true, 'La partie continue (1 loup vs 3 non-loups)');
    log(`nuit 3 : ${prey3.pseudo} dévoré — un kill par nuit tant que le loup vit ✓`);
  },

  /** La voyante sonde un loup et reçoit son vrai rôle ; un seul sondage par nuit. */
  voyante: async ({ newGame, log }) => {
    const g = await newGame('voyante', 8, { loup_garou: 2, voyante: 1, villageois: 5 });
    const seer = g.oneByRole('voyante');
    const wolf = g.wolves()[0];

    const vision = checkStatus(
      await api<{ result: { roleName: string; team: string } }>(
        'POST',
        `/api/games/${g.code}/power/seer`,
        { playerId: seer.id, targetId: wolf.id }
      ),
      200,
      'Sondage de la voyante'
    );
    check(vision.result.roleName === 'loup_garou', `La voyante doit voir loup_garou, reçu ${vision.result.roleName}`);
    check(vision.result.team === 'loups', 'La voyante doit voir la team loups');
    log(`vision correcte : ${wolf.pseudo} est loup_garou`);

    const second = await api('POST', `/api/games/${g.code}/power/seer`, {
      playerId: seer.id,
      targetId: g.plainVillagers()[0].id,
    });
    check(second.status === 400, `Deuxième sondage la même nuit : 400 attendu, reçu ${second.status}`);

    // Un non-voyante ne peut pas sonder.
    const usurper = await api('POST', `/api/games/${g.code}/power/seer`, {
      playerId: g.plainVillagers()[0].id,
      targetId: wolf.id,
    });
    check(usurper.status === 403, `Sondage par un villageois : 403 attendu, reçu ${usurper.status}`);
    log('unicité par nuit et contrôle de rôle ✓');
  },

  /** Sorcière : potion de vie sauve la victime, potion de mort tue, une seule fois chacune. */
  sorciere: async ({ newGame, log }) => {
    const g = await newGame('sorciere', 8, { loup_garou: 2, sorciere: 1, villageois: 5 });
    const witch = g.oneByRole('sorciere');
    const victim = g.plainVillagers()[0];

    // Nuit 1 : les loups votent, la sorcière voit la cible et la sauve.
    await g.wolfVote(victim.id);
    const witchStatus = checkStatus(
      await api<{ wolfTarget: { id: string } | null; hasLifePotion: boolean; hasDeathPotion: boolean }>(
        'GET',
        `/api/games/${g.code}/power/witch?playerId=${witch.id}`
      ),
      200,
      'Statut sorcière'
    );
    check(witchStatus.wolfTarget?.id === victim.id, 'La sorcière doit voir la cible des loups');
    check(witchStatus.hasLifePotion && witchStatus.hasDeathPotion, 'Les 2 potions doivent être disponibles');

    checkStatus(
      await api('POST', `/api/games/${g.code}/power/witch`, { playerId: witch.id, action: 'life_potion' }),
      200,
      'Potion de vie'
    );
    const night1 = await g.resolveNight();
    check(night1.witchSaved === true, 'Résolution : witchSaved attendu');
    check(g.player(victim.id).is_alive, 'La victime sauvée doit être vivante');
    log(`nuit 1 : ${victim.pseudo} sauvé par la potion de vie`);

    // Conseil blanc (personne ne vote) pour repasser en nuit.
    await g.toCouncil();
    const council = await g.resolveCouncil();
    check(!council.eliminated, 'Conseil sans vote : personne ne doit être éliminé');

    // Nuit 2 : les loups re-votent, la sorcière empoisonne un loup.
    const poisonTarget = g.wolves()[0];
    await g.wolfVote(victim.id);
    checkStatus(
      await api('POST', `/api/games/${g.code}/power/witch`, {
        playerId: witch.id,
        action: 'death_potion',
        targetId: poisonTarget.id,
      }),
      200,
      'Potion de mort'
    );
    const night2 = await g.resolveNight();
    check(night2.success === true, 'Résolution nuit 2 OK');
    check(!g.player(victim.id).is_alive, 'La victime des loups doit mourir (potion de vie épuisée)');
    check(!g.player(poisonTarget.id).is_alive, 'La cible empoisonnée doit mourir');
    log(`nuit 2 : ${victim.pseudo} dévoré, ${poisonTarget.pseudo} empoisonné`);

    // Nuit 3 : les deux potions sont épuisées.
    await g.toCouncil();
    await g.resolveCouncil();
    const lifeAgain = await api('POST', `/api/games/${g.code}/power/witch`, {
      playerId: witch.id,
      action: 'life_potion',
    });
    check(lifeAgain.status === 400, `Potion de vie déjà utilisée : 400 attendu, reçu ${lifeAgain.status}`);
    const deathAgain = await api('POST', `/api/games/${g.code}/power/witch`, {
      playerId: witch.id,
      action: 'death_potion',
      targetId: g.plainVillagers()[0].id,
    });
    check(deathAgain.status === 400, `Potion de mort déjà utilisée : 400 attendu, reçu ${deathAgain.status}`);
    log('potions à usage unique ✓');
  },

  /** Chasseur : éliminé au vote, il tire et emporte un joueur ; un seul tir. */
  chasseur: async ({ newGame, log }) => {
    const g = await newGame('chasseur', 8, { loup_garou: 2, chasseur: 1, villageois: 5 });
    const hunter = g.oneByRole('chasseur');

    await g.nightKill(g.plainVillagers()[0].id);
    const council = await g.councilKill(hunter.id);
    check(council.eliminated?.role === 'chasseur', 'Le chasseur doit être éliminé au vote');
    check(!g.player(hunter.id).is_alive, 'Le chasseur doit être mort');

    // Le chasseur mort tire sur un loup.
    const shotTarget = g.wolves()[0];
    const shot = checkStatus(
      await api<{ target: string; gameOver: boolean }>('POST', `/api/games/${g.code}/power/hunter`, {
        hunterId: hunter.id,
        targetId: shotTarget.id,
      }),
      200,
      'Tir du chasseur'
    );
    await g.refresh();
    check(!g.player(shotTarget.id).is_alive, 'La cible du chasseur doit mourir');
    check(shot.gameOver === false, 'La partie continue (1 loup restant)');
    log(`tir mortel : ${shotTarget.pseudo} abattu`);

    const secondShot = await api('POST', `/api/games/${g.code}/power/hunter`, {
      hunterId: hunter.id,
      targetId: g.plainVillagers()[0].id,
    });
    check(secondShot.status === 400, `Deuxième tir : 400 attendu, reçu ${secondShot.status}`);
    log('tir unique ✓');
  },

  /** Petite fille : lit le chat des loups, mais ne peut pas y écrire. */
  'petite-fille': async ({ newGame, log }) => {
    const g = await newGame('petite fille', 8, { loup_garou: 2, petite_fille: 1, villageois: 5 });
    const wolf = g.wolves()[0];
    const girl = g.oneByRole('petite_fille');

    checkStatus(
      await api('POST', `/api/games/${g.code}/wolf-chat`, {
        playerId: wolf.id,
        message: 'On mange qui cette nuit ?',
      }),
      200,
      'Message du loup'
    );

    const chat = checkStatus(
      await api<{ messages: { message: string }[] }>('GET', `/api/games/${g.code}/wolf-chat`),
      200,
      'Lecture du chat'
    );
    check(
      chat.messages.some((m) => m.message === 'On mange qui cette nuit ?'),
      'Le message du loup doit être lisible'
    );

    const write = await api('POST', `/api/games/${g.code}/wolf-chat`, {
      playerId: girl.id,
      message: 'coucou',
    });
    check(write.status === 403, `Écriture par la petite fille : 403 attendu, reçu ${write.status}`);
    log('chat loups : lecture ok, écriture interdite aux non-loups ✓');
  },

  /** Ancien : survit à la première attaque des loups, meurt à la seconde. */
  ancien: async ({ newGame, log }) => {
    const g = await newGame('ancien', 8, { loup_garou: 2, ancien: 1, villageois: 5 });
    const elder = g.oneByRole('ancien');

    const night1 = await g.nightKill(elder.id);
    check(night1.elderSaved === true, 'Nuit 1 : l\'ancien doit survivre à la première attaque');
    check(g.player(elder.id).is_alive, 'L\'ancien doit être vivant après la nuit 1');
    log('première attaque encaissée');

    await g.toCouncil();
    await g.resolveCouncil();

    const night2 = await g.nightKill(elder.id);
    check(night2.victim !== undefined, 'Nuit 2 : l\'ancien doit mourir à la seconde attaque');
    check(!g.player(elder.id).is_alive, 'L\'ancien doit être mort après la nuit 2');
    log('seconde attaque fatale ✓');
  },

  /** Salvateur : protège la cible des loups ; pas deux nuits de suite sur la même cible. */
  salvateur: async ({ newGame, log }) => {
    const g = await newGame('salvateur', 8, { loup_garou: 2, salvateur: 1, villageois: 5 });
    const savior = g.oneByRole('salvateur');
    const protectedPlayer = g.plainVillagers()[0];

    checkStatus(
      await api('POST', `/api/games/${g.code}/power/salvateur`, {
        playerId: savior.id,
        targetId: protectedPlayer.id,
      }),
      200,
      'Protection nuit 1'
    );
    await g.wolfVote(protectedPlayer.id);
    const night1 = await g.resolveNight();
    check(night1.salvateurSaved === true, 'Nuit 1 : salvateurSaved attendu');
    check(g.player(protectedPlayer.id).is_alive, 'Le protégé doit être vivant');
    log(`nuit 1 : ${protectedPlayer.pseudo} protégé des loups`);

    await g.toCouncil();
    await g.resolveCouncil();

    // Nuit 2 : même cible interdite, autre cible OK.
    const samTarget = await api('POST', `/api/games/${g.code}/power/salvateur`, {
      playerId: savior.id,
      targetId: protectedPlayer.id,
    });
    check(samTarget.status === 400, `Même cible deux nuits de suite : 400 attendu, reçu ${samTarget.status}`);

    const other = g.plainVillagers().find((p) => p.id !== protectedPlayer.id);
    check(other, 'Un autre villageois est requis');
    checkStatus(
      await api('POST', `/api/games/${g.code}/power/salvateur`, {
        playerId: savior.id,
        targetId: other.id,
      }),
      200,
      'Protection nuit 2 (autre cible)'
    );
    await g.wolfVote(other.id);
    const night2 = await g.resolveNight();
    check(night2.salvateurSaved === true, 'Nuit 2 : salvateurSaved attendu');
    log('rotation de protection ✓');
  },

  /** Cupidon : les amoureux meurent ensemble (chagrin) quand les loups en dévorent un. */
  cupidon: async ({ newGame, log }) => {
    const g = await newGame('cupidon', 8, { loup_garou: 2, cupidon: 1, villageois: 5 });
    const cupid = g.oneByRole('cupidon');
    const [lover1, lover2] = g.plainVillagers();

    checkStatus(
      await api('POST', `/api/games/${g.code}/power/cupidon`, {
        playerId: cupid.id,
        lover1Id: lover1.id,
        lover2Id: lover2.id,
      }),
      200,
      'Désignation des amoureux'
    );

    const again = await api('POST', `/api/games/${g.code}/power/cupidon`, {
      playerId: cupid.id,
      lover1Id: lover1.id,
      lover2Id: cupid.id,
    });
    check(again.status === 400, `Deuxième désignation : 400 attendu, reçu ${again.status}`);

    await g.nightKill(lover1.id);
    check(!g.player(lover1.id).is_alive, 'L\'amoureux dévoré doit être mort');
    check(!g.player(lover2.id).is_alive, 'Son amoureux doit mourir de chagrin');
    log(`${lover1.pseudo} dévoré → ${lover2.pseudo} mort de chagrin ✓`);
  },

  /** Trublion : échange les rôles de deux joueurs, une seule fois par partie. */
  trublion: async ({ newGame, log }) => {
    const g = await newGame('trublion', 8, { loup_garou: 2, trublion: 1, villageois: 5 });
    const trickster = g.oneByRole('trublion');
    const wolf = g.wolves()[0];
    const villager = g.plainVillagers()[0];

    checkStatus(
      await api('POST', `/api/games/${g.code}/power/trublion`, {
        playerId: trickster.id,
        target1Id: wolf.id,
        target2Id: villager.id,
      }),
      200,
      'Échange des rôles'
    );
    await g.refresh();
    check(g.player(wolf.id).role?.name === 'villageois', 'L\'ex-loup doit être villageois');
    check(g.player(villager.id).role?.name === 'loup_garou', 'L\'ex-villageois doit être loup');
    log(`${wolf.pseudo} ⇄ ${villager.pseudo} : rôles échangés`);

    const again = await api('POST', `/api/games/${g.code}/power/trublion`, {
      playerId: trickster.id,
      target1Id: g.plainVillagers()[0].id,
      target2Id: g.plainVillagers()[1].id,
    });
    check(again.status === 400, `Deuxième échange : 400 attendu, reçu ${again.status}`);

    // La nouvelle meute (loup restant + converti) dévore normalement.
    const prey = g.plainVillagers().find((p) => p.id !== wolf.id);
    check(prey, 'Une proie est requise');
    const night = await g.nightKill(prey.id);
    check(night.victim !== undefined, 'La nouvelle meute doit pouvoir dévorer');
    check(!g.player(prey.id).is_alive, 'La proie doit être morte');
    log('la meute recomposée fonctionne ✓');
  },

  /** Assassin : tue une fois, silencieusement, la nuit. */
  assassin: async ({ newGame, log }) => {
    const g = await newGame('assassin', 8, { loup_garou: 2, assassin: 1, villageois: 5 });
    const assassin = g.oneByRole('assassin');
    const target = g.plainVillagers()[0];

    checkStatus(
      await api('POST', `/api/games/${g.code}/power/assassin`, {
        playerId: assassin.id,
        targetId: target.id,
      }),
      200,
      'Assassinat'
    );
    await g.refresh();
    check(!g.player(target.id).is_alive, 'La cible assassinée doit être morte');
    log(`${target.pseudo} assassiné en pleine nuit`);

    const again = await api('POST', `/api/games/${g.code}/power/assassin`, {
      playerId: assassin.id,
      targetId: g.plainVillagers()[0].id,
    });
    check(again.status === 400, `Deuxième assassinat : 400 attendu, reçu ${again.status}`);
    log('assassinat unique ✓');
  },

  /** Assassin + Cupidon : l'amoureux assassiné doit entraîner son partenaire (chagrin). */
  'assassin-amoureux': async ({ newGame, log }) => {
    const g = await newGame('assassin amoureux', 8, {
      loup_garou: 2,
      assassin: 1,
      cupidon: 1,
      villageois: 4,
    });
    const cupid = g.oneByRole('cupidon');
    const assassin = g.oneByRole('assassin');
    const [lover1, lover2] = g.plainVillagers();

    checkStatus(
      await api('POST', `/api/games/${g.code}/power/cupidon`, {
        playerId: cupid.id,
        lover1Id: lover1.id,
        lover2Id: lover2.id,
      }),
      200,
      'Désignation des amoureux'
    );

    checkStatus(
      await api('POST', `/api/games/${g.code}/power/assassin`, {
        playerId: assassin.id,
        targetId: lover1.id,
      }),
      200,
      'Assassinat d\'un amoureux'
    );
    await g.refresh();
    check(!g.player(lover1.id).is_alive, 'L\'amoureux assassiné doit être mort');
    check(!g.player(lover2.id).is_alive, 'Son amoureux doit mourir de chagrin (cascade assassin)');
    log('cascade chagrin après assassinat ✓');
  },

  /** Chasseur + Cupidon : le tir du chasseur sur un amoureux entraîne le partenaire. */
  'chasseur-amoureux': async ({ newGame, log }) => {
    const g = await newGame('chasseur amoureux', 8, {
      loup_garou: 2,
      chasseur: 1,
      cupidon: 1,
      villageois: 4,
    });
    const cupid = g.oneByRole('cupidon');
    const hunter = g.oneByRole('chasseur');
    const [lover1, lover2] = g.plainVillagers();

    checkStatus(
      await api('POST', `/api/games/${g.code}/power/cupidon`, {
        playerId: cupid.id,
        lover1Id: lover1.id,
        lover2Id: lover2.id,
      }),
      200,
      'Désignation des amoureux'
    );

    // Nuit blanche pour atteindre le jour, puis le village élimine le chasseur.
    await g.nightKill(g.byRole('cupidon')[0].id);
    const council = await g.councilKill(hunter.id);
    check(council.eliminated?.role === 'chasseur', 'Le chasseur doit être éliminé');

    checkStatus(
      await api('POST', `/api/games/${g.code}/power/hunter`, {
        hunterId: hunter.id,
        targetId: lover1.id,
      }),
      200,
      'Tir du chasseur sur un amoureux'
    );
    await g.refresh();
    check(!g.player(lover1.id).is_alive, 'L\'amoureux abattu doit être mort');
    check(!g.player(lover2.id).is_alive, 'Son amoureux doit mourir de chagrin (cascade tir chasseur)');
    log('cascade chagrin après tir du chasseur ✓');
  },

  /** Enfant sauvage : devient loup quand son modèle meurt. */
  'enfant-sauvage': async ({ newGame, log }) => {
    const g = await newGame('enfant sauvage', 8, { loup_garou: 1, enfant_sauvage: 1, villageois: 6 });
    const child = g.oneByRole('enfant_sauvage');
    const model = g.plainVillagers()[0];

    // Le choix du modèle n'est possible qu'au jour 1 → nuit blanche d'abord.
    const prey = g.plainVillagers().find((p) => p.id !== model.id);
    check(prey, 'Une proie est requise');
    await g.nightKill(prey.id);

    checkStatus(
      await api('POST', `/api/games/${g.code}/power/wild-child`, {
        playerId: child.id,
        modelId: model.id,
      }),
      200,
      'Choix du modèle'
    );

    // Le village élimine le modèle → transformation.
    const council = await g.councilKill(model.id);
    check(council.eliminated?.id === model.id, 'Le modèle doit être éliminé');
    check(
      g.player(child.id).role?.name === 'loup_garou',
      'L\'enfant sauvage doit devenir loup_garou à la mort de son modèle'
    );
    check(council.gameOver === false, 'La partie continue (2 loups vs 4 villageois)');
    log(`${child.pseudo} a rejoint la meute ✓`);

    // La nouvelle meute (loup initial + enfant transformé) vote et dévore.
    const nextPrey = g.plainVillagers()[0];
    check(g.wolves().length === 2, '2 loups attendus après transformation');
    const night = await g.nightKill(nextPrey.id);
    check(night.victim !== undefined, 'La meute élargie doit dévorer');
    log('l\'enfant transformé chasse avec la meute ✓');
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Exécution
// ─────────────────────────────────────────────────────────────────────────────

async function waitForServer(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return;
    } catch {
      // serveur pas encore prêt
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(
    `Serveur injoignable sur ${BASE_URL}. Lancer \`npm run dev\` (en session cloud : NODE_USE_ENV_PROXY=1 npm run dev).`
  );
}

async function main(): Promise<void> {
  const names = Object.keys(scenarios);
  if (LIST_ONLY) {
    console.log(names.join('\n'));
    return;
  }

  const selected = ONLY ? names.filter((n) => n === ONLY) : names;
  if (selected.length === 0) {
    console.error(`Scénario inconnu : ${ONLY}\nDisponibles : ${names.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  await waitForServer();
  const rolesByName = await fetchRoles();
  console.log(`Référentiel : ${rolesByName.size} rôles actifs — ${[...rolesByName.keys()].join(', ')}\n`);

  const results: { name: string; ok: boolean; error?: string; code?: string }[] = [];

  for (const name of selected) {
    const games: GameClient[] = [];
    const ctx: ScenarioContext = {
      rolesByName,
      newGame: async (gameName, nPlayers, distribution) => {
        const g = new GameClient(rolesByName);
        await g.create(gameName, nPlayers);
        games.push(g);
        await g.configureRoles(distribution);
        await g.start();
        return g;
      },
      log: (message) => console.log(`   · ${message}`),
    };

    console.log(`▶ ${name}`);
    try {
      await scenarios[name](ctx);
      results.push({ name, ok: true, code: games[0]?.code });
      console.log(`✅ ${name}\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ name, ok: false, error: message, code: games[0]?.code });
      console.error(`❌ ${name} — ${message}`);
      if (games[0]?.code) console.error(`   (partie ${games[0].code})`);
      console.error('');
    } finally {
      if (!KEEP_GAMES) {
        for (const g of games) await g.cleanup();
      } else {
        for (const g of games) console.log(`   partie conservée : ${g.code}`);
      }
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log('─'.repeat(60));
  console.log(`${results.length - failed.length}/${results.length} scénarios OK`);
  if (failed.length > 0) {
    for (const f of failed) console.log(`  ❌ ${f.name} — ${f.error}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
