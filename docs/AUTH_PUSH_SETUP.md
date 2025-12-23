# Configuration Auth & Push Notifications

## 1. Générer les VAPID Keys

Les VAPID keys sont nécessaires pour les Web Push Notifications.

```bash
npx web-push generate-vapid-keys
```

Cela génère :
- Public Key → `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (côté client)
- Private Key → `VAPID_PRIVATE_KEY` (côté serveur/Edge Function)

## 2. Variables d'environnement

### Local (.env.local)

```env
# Supabase (existant)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...

# VAPID Keys (Web Push)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BPxxx...
```

### Supabase Edge Functions Secrets

Via le dashboard Supabase → Settings → Edge Functions → Secrets :

```
VAPID_PUBLIC_KEY=BPxxx...
VAPID_PRIVATE_KEY=xxx...
VAPID_SUBJECT=mailto:hello@moonfall.app
```

Ou via CLI :
```bash
supabase secrets set VAPID_PUBLIC_KEY=BPxxx...
supabase secrets set VAPID_PRIVATE_KEY=xxx...
supabase secrets set VAPID_SUBJECT=mailto:hello@moonfall.app
```

## 3. Déployer l'Edge Function

```bash
supabase functions deploy push --no-verify-jwt
```

## 4. Configurer le Database Webhook

Dans Supabase Dashboard → Database → Webhooks :

1. **Create webhook**
2. **Name:** `push_on_game_event`
3. **Table:** `game_events`
4. **Events:** `INSERT`
5. **Type:** Supabase Edge Functions
6. **Function:** `push`
7. **Method:** POST
8. **Headers/Params:** Laisser vides (déployé avec `--no-verify-jwt`)

## 5. Configurer Supabase Auth (email)

Dans Supabase Dashboard → Authentication → Settings → Email Templates :

Personnaliser le template "Magic Link / OTP" pour Moonfall :

**Subject:** `🐺 Ton code de connexion Moonfall`

**Body:**
```html
<h2>Connexion à Moonfall</h2>
<p>Voici ton code de connexion :</p>
<h1 style="font-size: 32px; letter-spacing: 4px;">{{ .Token }}</h1>
<p>Ce code expire dans 1 heure.</p>
```

## 6. Test local

Pour tester les push en local, il faut un tunnel HTTPS (ngrok, etc.) car les Service Workers nécessitent HTTPS.

```bash
# Terminal 1: Next.js
npm run dev

# Terminal 2: ngrok
ngrok http 3000

# Utiliser l'URL ngrok pour tester
```

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────────┐
│   Client        │     │   Supabase       │     │   Edge Function   │
│   (React)       │     │   (PostgreSQL)   │     │   (push)          │
└────────┬────────┘     └────────┬─────────┘     └─────────┬─────────┘
         │                       │                         │
         │ 1. Subscribe to Push  │                         │
         │ ─────────────────────>│                         │
         │   (save in DB)        │                         │
         │                       │                         │
         │ 2. Game phase changes │                         │
         │                       │ ──────────────────────> │
         │                       │   (INSERT game_events)  │
         │                       │                         │
         │                       │                         │ 3. Webhook trigger
         │                       │                         │ ────────────────>
         │                       │                         │   (fetch subscriptions)
         │                       │                         │
         │ 4. Push notification  │ <────────────────────── │
         │ <─────────────────────│   (Web Push API)        │
         │                       │                         │
```
