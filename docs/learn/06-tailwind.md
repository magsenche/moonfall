# 🎨 Tailwind CSS

> Classes utilitaires, cn(), responsive.

## Principe

Tailwind utilise des **classes atomiques** au lieu de CSS personnalisé.

```tsx
// Au lieu de :
// .button { padding: 8px 16px; background: blue; border-radius: 4px; }

// On écrit :
<button className="px-4 py-2 bg-blue-500 rounded">
  Click
</button>
```

---

## Classes fréquentes

### Layout
```
flex              # display: flex
grid              # display: grid
items-center      # align-items: center
justify-between   # justify-content: space-between
gap-4             # gap: 1rem
```

### Spacing
```
p-4               # padding: 1rem (tous les côtés)
px-4              # padding horizontal
py-2              # padding vertical
m-2               # margin: 0.5rem
mt-4              # margin-top
space-y-2         # gap vertical entre enfants
```

### Sizing
```
w-full            # width: 100%
h-12              # height: 3rem
min-h-screen      # min-height: 100vh
max-w-md          # max-width: 28rem
```

### Colors
```
bg-zinc-900       # background-color
text-white        # color
border-red-500    # border-color
```

### Typography
```
text-lg           # font-size
font-bold         # font-weight
text-center       # text-align
```

### Responsive
```
md:flex           # display: flex à partir de 768px
lg:hidden         # display: none à partir de 1024px
sm:text-lg        # font-size large à partir de 640px
```

### States
```
hover:bg-blue-600     # au survol
disabled:opacity-50   # quand disabled
focus:ring-2          # au focus
active:scale-95       # au clic
```

---

## La fonction `cn()`

Combine et déduplique les classes Tailwind.

```tsx
// lib/utils/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Utilisation

```tsx
// Conditionnel
<div className={cn(
  'p-4 rounded',                    // Toujours
  isActive && 'bg-blue-500',         // Si actif
  isError && 'border-red-500'        // Si erreur
)} />

// Avec props externes
function Button({ className, ...props }) {
  return (
    <button 
      className={cn('px-4 py-2 rounded', className)} 
      {...props} 
    />
  );
}

// Évite les conflits
cn('p-4', 'p-2')  // → 'p-2' (le dernier gagne)
```

---

## Dans Moonfall

```tsx
// components/ui/button.tsx
export function Button({ variant = 'primary', className, ...props }) {
  return (
    <button
      className={cn(
        // Base
        'px-4 py-2 rounded-lg font-medium transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        // Variants
        variant === 'primary' && 'bg-blue-500 hover:bg-blue-600 text-white',
        variant === 'secondary' && 'bg-zinc-700 hover:bg-zinc-600 text-white',
        variant === 'danger' && 'bg-red-500 hover:bg-red-600 text-white',
        // Props externes
        className
      )}
      {...props}
    />
  );
}
```

---

## Palette Moonfall

```
Fond principal:  bg-zinc-950, bg-zinc-900
Cartes:          bg-zinc-800, bg-zinc-800/50
Texte:           text-white, text-zinc-100, text-zinc-400
Accent village:  text-blue-400, bg-blue-500
Accent loups:    text-red-400, bg-red-500
Bordures:        border-zinc-700, border-zinc-600
```

---

## Touch targets (mobile)

Minimum **44px** pour les boutons sur mobile :

```tsx
// ✅ Bon
<button className="min-h-[44px] min-w-[44px] p-3">

// ❌ Trop petit
<button className="p-1">
```

---

## Ressources

- [Tailwind Docs](https://tailwindcss.com/docs)
- [Tailwind Cheat Sheet](https://nerdcave.com/tailwind-cheat-sheet)

---

*Suivant : [07-patterns.md](./07-patterns.md)*
