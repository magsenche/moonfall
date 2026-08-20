/**
 * Régénère les captures d'écran du tutoriel (`public/tutorial/*.png`).
 *
 * À relancer après tout changement visuel de l'accueil, du lobby, des écrans
 * de phase ou de la galerie de rôles — la page /tutorial montre ces captures,
 * elles doivent correspondre au design courant.
 *
 * Usage :
 *   npm run dev            # serveur requis (cloud : NODE_USE_ENV_PROXY=1)
 *   npm run tutorial:shots
 *
 * Le script crée une vraie partie « Partie Tutorial » via l'API (comme le
 * runner de scénarios), la pilote jusqu'au conseil, capture chaque écran en
 * 390x844 (iPhone), puis termine la partie. Chromium : chemin de l'env cloud
 * (/opt/pw-browsers/chromium) ou variable TUTORIAL_CHROMIUM, sinon le Chrome
 * installé localement.
 */

import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const BASE = process.env.TUTORIAL_BASE_URL ?? 'http://localhost:3000';
const OUT = new URL('../public/tutorial/', import.meta.url).pathname;

const CLOUD_CHROMIUM = '/opt/pw-browsers/chromium';
const executablePath = process.env.TUTORIAL_CHROMIUM ?? (existsSync(CLOUD_CHROMIUM) ? CLOUD_CHROMIUM : undefined);

let ipCounter = 0;
const nextIp = () => `10.97.0.${++ipCounter + 1}`;

async function api(method, path, body, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(data)}`);
  return data;
}

// ── Partie pilotée par l'API ─────────────────────────────────────────────────
const health = await fetch(`${BASE}/api/health`).catch(() => null);
if (!health?.ok) {
  throw new Error(`Serveur injoignable sur ${BASE}. Lancer \`npm run dev\` d'abord.`);
}

const NAMES = ['Magsen', 'Alice', 'Bob', 'Chloe', 'David', 'Emma', 'Felix', 'Gina'];
const created = await api('POST', '/api/games', { name: 'Partie Tutorial', pseudo: NAMES[0] }, { 'x-forwarded-for': nextIp() });
const code = created.code;
const players = { [NAMES[0]]: created.playerId };
console.log(`partie ${code} créée`);

// ── Navigateur : profil iPhone, overlays de dev et tips coupés ───────────────
const browser = await chromium.launch(executablePath ? { executablePath } : { channel: 'chrome' });

// En session cloud, Chromium ne peut pas joindre Supabase (egress proxifié) :
// les requêtes REST du navigateur (galerie de rôles…) sont interceptées et
// rejouées depuis Node, qui passe par le proxy. Transparent en local.
async function relaySupabase(context) {
  await context.route('https://*.supabase.co/**', async (route) => {
    const req = route.request();
    try {
      const res = await fetch(req.url(), {
        method: req.method(),
        headers: req.headers(),
        body: ['GET', 'HEAD'].includes(req.method()) ? undefined : req.postData(),
      });
      const body = Buffer.from(await res.arrayBuffer());
      const headers = Object.fromEntries(res.headers.entries());
      delete headers['content-encoding'];
      delete headers['content-length'];
      await route.fulfill({ status: res.status, headers, body });
    } catch {
      await route.abort();
    }
  });
}

async function withPage(pseudo, fn, { roleKey = null } = {}) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  await relaySupabase(context);
  const session = pseudo
    ? { sessions: { [code]: { playerId: players[pseudo], gameCode: code, pseudo, joinedAt: Date.now() } } }
    : { sessions: {} };
  await context.addInitScript(
    ([sessionJson, rk]) => {
      localStorage.setItem('moonfall_sessions', sessionJson);
      // Tips et onboarding masqués : les captures montrent l'écran, pas les toasts
      localStorage.setItem(
        'moonfall_tips_dismissed',
        JSON.stringify(Object.fromEntries(
          ['welcome', 'first_vote', 'wolf_chat', 'seer_power', 'little_girl_spy', 'witch_potions', 'phase_help', 'rules_available'].map((t) => [t, true])
        ))
      );
      localStorage.setItem('moonfall_onboarding_seen', JSON.stringify(['pwa-ios', 'auto-garou', 'share-code']));
      if (rk) localStorage.setItem(rk, 'true');
    },
    [JSON.stringify(session), roleKey]
  );
  const page = await context.newPage();
  await fn(page);
  await context.close();
}

async function snap(page, name) {
  // L'overlay d'erreurs du dev server n'a rien à faire sur une capture
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' }).catch(() => {});
  await page.screenshot({ path: `${OUT}${name}.png` });
  console.log(`📸 ${name}`);
}

// 1-2. Accueil + formulaire de création
await withPage(null, async (page) => {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await snap(page, '01-home');
  await page.getByText('Créer une partie').first().click();
  await page.waitForTimeout(800);
  await snap(page, '02-create-game');
});

// 3. Lobby côté MJ, encore presque vide (code + QR)
for (const pseudo of NAMES.slice(1, 3)) {
  const joined = await api('POST', `/api/games/${code}/join`, { pseudo }, { 'x-forwarded-for': nextIp() });
  players[pseudo] = joined.player?.id ?? joined.playerId;
}
await withPage('Magsen', async (page) => {
  await page.goto(`${BASE}/game/${code}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await snap(page, '03-lobby');
});

// 4. Le lobby se remplit : vue joueur, scrollée sur la liste
for (const pseudo of NAMES.slice(3)) {
  const joined = await api('POST', `/api/games/${code}/join`, { pseudo }, { 'x-forwarded-for': nextIp() });
  players[pseudo] = joined.player?.id ?? joined.playerId;
}
await withPage('Alice', async (page) => {
  await page.goto(`${BASE}/game/${code}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.getByText('Ton avatar').first().scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(500);
  await snap(page, '04-lobby-players');
});

// 5-7. Nuit / jour / conseil — composition classique en Auto-Garou
await api('PATCH', `/api/games/${code}/settings`, {
  playerId: players.Magsen,
  settings: { classicComposition: true, autoMode: true },
});
await api('POST', `/api/games/${code}/start`);
const game = await api('GET', `/api/games/${code}`);

const rolesRes = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/roles?select=id,name&is_active=eq.true`,
  {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}`,
    },
  }
);
const roleNameById = Object.fromEntries((await rolesRes.json()).map((r) => [r.id, r.name]));
const villager = game.players.find((p) => roleNameById[p.role_id] === 'villageois');
const villagerRoleKey = `role-revealed-${game.id}-${villager.role_id}`;

await withPage(villager.pseudo, async (page) => {
  await page.goto(`${BASE}/game/${code}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await snap(page, '05-night-phase');
});
await withPage(villager.pseudo, async (page) => {
  await page.goto(`${BASE}/game/${code}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await snap(page, '05-night-phase-header');
}, { roleKey: villagerRoleKey });

await api('POST', `/api/games/${code}/phase`, { phase: 'jour' });
await withPage(villager.pseudo, async (page) => {
  await page.goto(`${BASE}/game/${code}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await snap(page, '06-day-phase');
}, { roleKey: villagerRoleKey });

await api('POST', `/api/games/${code}/phase`, { phase: 'conseil' });
await withPage(villager.pseudo, async (page) => {
  await page.goto(`${BASE}/game/${code}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await snap(page, '07-vote-phase');
}, { roleKey: villagerRoleKey });

// 8. Galerie de rôles, cachée puis révélée
await withPage(null, async (page) => {
  await page.goto(`${BASE}/roles`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await snap(page, '08-roles-gallery');
  // Les cartes face cachée affichent « ??? » ; un tap les retourne
  const hidden = page.getByText('???');
  if ((await hidden.count()) > 0) {
    await hidden.first().click().catch(() => {});
    await page.waitForTimeout(900);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  await snap(page, '08-roles-gallery-revealed');
});

await browser.close();

// ── Nettoyage : la partie de capture se termine ──────────────────────────────
await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/games?code=eq.${code}`,
  {
    method: 'PATCH',
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'terminee' }),
  }
);
console.log(`done — partie ${code} terminée, captures dans public/tutorial/`);
