# 🔔 Push Notifications

> Notifications Web Push pour alerter les joueurs des changements de phase.

## Stack

| Composant | Technologie |
|-----------|-------------|
| Protocol | Web Push (VAPID) |
| Client | Service Worker + Push API |
| Serveur | Supabase Edge Function |
| Trigger | Database Webhook sur `game_events` |

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────────┐
│   Client        │     │   Supabase       │     │   Edge Function   │
│   (React)       │     │   (PostgreSQL)   │     │   (push)          │
└────────┬────────┘     └────────┬─────────┘     └─────────┬─────────┘
         │                       │                         │
         │ 1. Subscribe          │                         │
         │ ─────────────────────>│                         │
         │   (save subscription) │                         │
         │                       │                         │
         │                       │ 2. INSERT game_event    │
         │                       │ ──────────────────────> │
         │                       │   (webhook trigger)     │
         │                       │                         │
         │                       │                         │ 3. Fetch subscriptions
         │                       │ <────────────────────── │
         │                       │                         │
         │ 4. Push notification  │                         │
         │ <─────────────────────│ <────────────────────── │
         │   (Web Push API)      │                         │
```

---

## Configuration

### 1. Générer les VAPID Keys

```bash
npx web-push generate-vapid-keys
```

Résultat :
- **Public Key** → Client + Edge Function
- **Private Key** → Edge Function uniquement

### 2. Variables d'environnement

**Local (.env.local):**
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BPxxx...
```

**Supabase Edge Function Secrets:**
```bash
supabase secrets set VAPID_PUBLIC_KEY=BPxxx...
supabase secrets set VAPID_PRIVATE_KEY=xxx...
supabase secrets set VAPID_SUBJECT=mailto:hello@moonfall.app
```

### 3. Déployer l'Edge Function

```bash
supabase functions deploy push --no-verify-jwt
```

### 4. Configurer le Database Webhook

Dashboard Supabase → Database → Webhooks :

| Paramètre | Valeur |
|-----------|--------|
| Name | `push_on_game_event` |
| Table | `game_events` |
| Events | `INSERT` |
| Type | Supabase Edge Functions |
| Function | `push` |

---

## Côté Client

### Demander la permission

```typescript
// src/lib/notifications/useNotifications.ts
const { permission, subscribe } = useNotifications()

// Demander permission et s'abonner
await subscribe()
```

### Service Worker

```javascript
// public/sw.js
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: { url: data.url }
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url
  if (url) {
    event.waitUntil(clients.openWindow(url))
  }
})
```

### Composant UI

```tsx
// src/components/game/notification-prompt.tsx
<NotificationPrompt gameCode={code} />
```

---

## Types d'événements notifiés

| Event Type | Message |
|------------|---------|
| `phase_change` | "La phase {phase} commence !" |
| `player_killed` | "{player} a été éliminé" |
| `game_started` | "La partie commence !" |
| `game_ended` | "Partie terminée - {winner} gagne !" |

---

## Fichiers clés

| Fichier | Description |
|---------|-------------|
| `public/sw.js` | Service Worker |
| `public/manifest.json` | PWA manifest |
| `src/lib/notifications/useNotifications.ts` | Hook React |
| `src/lib/notifications/index.ts` | subscribeToPush helper |
| `src/components/game/notification-prompt.tsx` | UI permission |
| `supabase/functions/push/index.ts` | Edge Function |

---

## Test local

Les Service Workers nécessitent HTTPS. Pour tester en local :

```bash
# Terminal 1: Next.js
npm run dev

# Terminal 2: ngrok (tunnel HTTPS)
ngrok http 3000

# Utiliser l'URL ngrok
```

---

## Troubleshooting

### Permission refusée

L'utilisateur a bloqué les notifications. Il doit aller dans les paramètres du navigateur pour réautoriser.

### Notifications ne s'affichent pas

1. Vérifier que le Service Worker est enregistré (DevTools → Application → Service Workers)
2. Vérifier les logs Edge Function : `supabase functions logs push`
3. Vérifier que le webhook est configuré
4. Tester l'Edge Function manuellement

### iOS Safari

iOS 16.4+ supporte les Web Push, mais uniquement si l'app est ajoutée à l'écran d'accueil (PWA).

```
1. Ouvrir dans Safari
2. Partager → "Sur l'écran d'accueil"
3. Ouvrir depuis l'écran d'accueil
4. Accepter les notifications
```

---

## ✅ Implémenté

- [x] Service Worker avec gestion push events
- [x] Edge Function pour envoi des notifications
- [x] Webhook sur game_events
- [x] UI permission prompt dans le jeu
- [x] Notifications changement de phase
- [x] Support iOS PWA (ajout écran d'accueil)
- [x] Refresh auto au retour foreground (iOS)

## À faire

- [ ] Notifications pour création/update de missions
- [ ] Préférences de notification par joueur
- [ ] Son personnalisé par type d'événement
- [ ] Badge count (nombre de notifications non lues)
- [ ] Rich notifications avec actions (boutons)

---

*Voir aussi: [SUPABASE.md](./SUPABASE.md)*
