# 🧩 Patterns avancés

> API routes, composition, sessions, PWA.

## API Routes Next.js

Les fichiers `route.ts` dans `app/api/` sont des **endpoints backend**.

```tsx
// app/api/games/[code]/vote/route.ts
import { NextRequest, NextResponse } from 'next/server';

// POST /api/games/ABC123/vote
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  // 1. Récupérer les params et le body
  const { code } = await params;
  const { targetId, playerId } = await request.json();

  // 2. Valider
  if (!targetId || !playerId) {
    return NextResponse.json(
      { error: 'Missing targetId or playerId' },
      { status: 400 }
    );
  }

  // 3. Logique métier (DB, calculs...)
  const { error } = await supabase
    .from('votes')
    .insert({ voter_id: playerId, target_id: targetId });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 4. Retourner le résultat
  return NextResponse.json({ success: true });
}

// GET /api/games/ABC123/vote
export async function GET(request: NextRequest, { params }) {
  const { code } = await params;
  const votes = await fetchVotes(code);
  return NextResponse.json(votes);
}
```

**Appel côté client :**
```tsx
// lib/api/games.ts
export async function vote(code: string, targetId: string, playerId: string) {
  const res = await fetch(`/api/games/${code}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetId, playerId })
  });
  if (!res.ok) throw new Error('Vote failed');
  return res.json();
}
```

---

## Sessions et localStorage

Le localStorage persiste des données **côté navigateur**.

```tsx
// Écrire
localStorage.setItem('key', 'value');
localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Alice' }));

// Lire
const value = localStorage.getItem('key');
const user = JSON.parse(localStorage.getItem('user') || '{}');

// Supprimer
localStorage.removeItem('key');
```

**Dans Moonfall (player-session.ts) :**
```tsx
const STORAGE_KEY = (code: string) => `moonfall_session_${code}`;

export function getPlayerSession(code: string): PlayerSession | null {
  const stored = localStorage.getItem(STORAGE_KEY(code));
  return stored ? JSON.parse(stored) : null;
}

export function setPlayerSession(code: string, session: PlayerSession) {
  localStorage.setItem(STORAGE_KEY(code), JSON.stringify(session));
}
```

---

## Composition vs Props

```tsx
// ❌ Trop de props (prop drilling)
<Card title="..." subtitle="..." icon="..." actions={[...]} footer="..." />

// ✅ Composition (plus flexible)
<Card>
  <Card.Header>
    <Icon name="..." />
    <Title>...</Title>
  </Card.Header>
  <Card.Body>...</Card.Body>
  <Card.Footer>...</Card.Footer>
</Card>
```

---

## Early returns (lisibilité)

```tsx
// ❌ Imbrication profonde
function Component({ user, data }) {
  if (user) {
    if (data) {
      return <div>{data}</div>;
    } else {
      return <Loading />;
    }
  } else {
    return <Login />;
  }
}

// ✅ Early returns
function Component({ user, data }) {
  if (!user) return <Login />;
  if (!data) return <Loading />;
  return <div>{data}</div>;
}
```

---

## Web Push Notifications (PWA)

### Architecture
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │◀────│   Supabase  │◀────│   Database  │
│   (SW)      │     │   Edge Fn   │     │   Trigger   │
└─────────────┘     └─────────────┘     └─────────────┘
      ▲                    │
      │                    │ POST avec VAPID
      │                    ▼
      └──────────── Push Service (Google/Apple)
```

### Service Worker (public/sw.js)
```js
// Reçoit les notifications push
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon-192.png',
    data: { url: data.url }
  });
});

// Clic sur la notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
```

### S'abonner aux notifications
```tsx
// 1. Demander la permission
const permission = await Notification.requestPermission();

// 2. Enregistrer le Service Worker
const registration = await navigator.serviceWorker.register('/sw.js');

// 3. S'abonner avec la clé VAPID
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: VAPID_PUBLIC_KEY
});

// 4. Envoyer au serveur
await fetch('/api/subscribe', {
  method: 'POST',
  body: JSON.stringify(subscription)
});
```

---

## Résumé

| Pattern | Où dans Moonfall | Quand l'utiliser |
|---------|------------------|------------------|
| API Routes | `app/api/games/[code]/` | Logique backend sécurisée |
| localStorage | `player-session.ts` | Persistance session sans auth |
| Composition | `components/game/` | Composants flexibles |
| Early returns | Partout | Code lisible |
| Service Worker | `public/sw.js` | Notifications push, PWA |

---

*Retour à [l'index](./README.md)*
