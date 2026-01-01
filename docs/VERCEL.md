# 🚀 Vercel

> Hébergement et déploiement continu.

## Configuration

**Projet:** moonfall  
**URL Production:** https://moonfall.fr  
**Dashboard:** https://vercel.com/magsenche/moonfall

---

## Déploiement

### Automatique (CD)

Chaque push sur `main` déclenche un déploiement automatique.

```bash
git push origin main
# → Build + Deploy automatique (~1-2 min)
```

### Preview Deployments

Chaque PR crée une URL de preview unique pour tester avant merge.

### Manuel

```bash
# Via Vercel CLI
npx vercel

# Production
npx vercel --prod
```

---

## Variables d'environnement

Configurer dans Vercel Dashboard → Settings → Environment Variables.

| Variable | Environnement | Description |
|----------|---------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | All | URL Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | All | Clé publique Supabase |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | All | Clé publique VAPID |

> Note: Les variables `NEXT_PUBLIC_*` sont exposées côté client.

---

## Build

### Commande de build

```bash
npm run build
```

### Output

- Framework: Next.js
- Build Command: `next build`
- Output Directory: `.next`
- Install Command: `npm install`

### Optimisations activées

- ✅ React Compiler (Next.js 16)
- ✅ Turbopack (dev)
- ✅ Image Optimization
- ✅ Edge Runtime compatible

---

## Domaines

| Type | URL |
|------|-----|
| Production | moonfall.fr |
| Alias | moonfall.vercel.app |
| Redirect | www.moonfall.fr → moonfall.fr |

---

## Logs et Monitoring

### Voir les logs

1. Vercel Dashboard → Deployments → Sélectionner un déploiement
2. Onglet "Functions" pour les logs API routes
3. Onglet "Runtime Logs" pour les erreurs

### Intégrations possibles

- Sentry (error tracking)
- Axiom (logs)
- Vercel Analytics (performance)

---

## Fichiers clés

| Fichier | Description |
|---------|-------------|
| `next.config.ts` | Configuration Next.js |
| `vercel.json` | Configuration Vercel (optionnel) |
| `.env.local` | Variables locales (non committé) |

---

## Troubleshooting

### Build échoue

```bash
# Tester le build localement
npm run build

# Voir les erreurs TypeScript
npm run lint
```

### API Routes timeout

Les API Routes ont un timeout de 10s (Hobby) / 60s (Pro).
Pour les opérations longues, utiliser des Edge Functions Supabase.

### Cache issues

```bash
# Forcer un redéploiement propre
# Dashboard → Deployments → ... → Redeploy (sans cache)
```

---

## À faire

- [x] Domaine custom moonfall.fr ✅
- [ ] Vercel Analytics
- [x] Error tracking (Sentry) ✅
- [ ] Optimisation des API Routes (Edge Runtime)
- [ ] Rate limiting sur les endpoints publics

---

*Voir aussi: [STACK.md](./STACK.md)*
