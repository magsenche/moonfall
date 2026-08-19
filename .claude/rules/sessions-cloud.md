# Sessions cloud : mesurer l'environnement avant de planifier

Règles apprises le 2026-08-19 (une session perdue sur le setup, une demi-session
sur le proxy). Elles ne concernent que les sessions Claude Code cloud/web ; en
local, ignorer ce fichier.

- **Vérifier l'environnement d'abord.** Une session moonfall se lance sur
  l'environnement Claude « Moonfall » (réseau autorisé : `*.supabase.co`,
  `moonfall.fr`, `*.vercel.app`, fonts Google, Sentry ; variables
  `NEXT_PUBLIC_SUPABASE_*` injectées), pas sur l'environnement par défaut.
  Premier réflexe :
  `env | grep NEXT_PUBLIC_SUPABASE` puis
  `curl -sS -o /dev/null -w '%{http_code}' "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/"`.
  Attendu : 200/401. Un 403 vient du proxy de l'environnement (mauvais env ou
  politique réseau) : se signale à l'utilisateur, ne se contourne pas, ne se
  déboggue pas côté Supabase.
- **Les WebSockets ne passent pas le proxy egress** — non supporté, définitif.
  Supabase Realtime (synchro live des écrans de jeu, votes, chat des loups,
  missions) ne fonctionnera jamais depuis un conteneur cloud ; REST et Auth
  passent. Tester en single-client avec rechargements manuels entre les phases,
  et marquer « temps réel non testé » dans le rapport. Le test temps réel /
  multi-joueurs se fait en local ou sur la preview Vercel depuis un vrai
  appareil.
- **Plomberie proxy** : le fetch intégré de Node ignore `HTTPS_PROXY` → lancer le
  serveur dev avec `NODE_USE_ENV_PROXY=1` pour les appels server-side. Playwright
  force même `localhost` à travers le proxy →
  `PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK=1`. Au moindre souci
  réseau, lire `/root/.ccr/README.md` et
  `curl -sS "$HTTPS_PROXY/__agentproxy/status"` **avant** de déboguer quoi que ce
  soit d'autre.
- **Script de setup de l'environnement** (réglages claude.ai, pas ce repo) :
  `cd /home/user/moonfall && npm install` — le script s'exécute dans
  `/home/user`, pas dans le repo cloné.
