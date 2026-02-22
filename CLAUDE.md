# ProxStock Dashboard

## Projet
Dashboard de gestion de stock pour la communauté de resell **Proxcop** (~200 membres). App **mobile-first**, dark mode exclusif. Les membres trackent leurs achats, ventes, profits et analytics.

## Stack
- **Next.js 15** (App Router, Server Components, Server Actions)
- **TypeScript** (TSX) — fichiers `.tsx`
- **Tailwind CSS v4** + **shadcn/ui** (composants dans `src/components/ui/`)
- **Drizzle ORM** + **Neon PostgreSQL**
- **Auth.js v5** + Discord OAuth2 (vérification guild Proxcop)
- **Cloudflare R2** pour les images (presigned upload)
- **Recharts** pour les graphiques
- **html-to-image** pour l'export PNG
- **StockX API v2** (OAuth2, catalog search, variants)

## Architecture

### Modèle de données (parent/enfant)
- `products` = produit parent (nom, SKU, catégorie, image)
- `productVariants` = unité physique (taille, prix achat, statut, stockage)
- `sales` = vente liée à un variant (FK `variantId`)
- 1 produit parent → N variants → chaque variant a son cycle de vie

### Structure clé
```
src/
  app/(app)/           # Pages protégées (dashboard, stock, ventes, stats)
  app/(auth)/           # Login Discord
  app/api/              # API routes (sku-lookup, stockx/search, export/*)
  components/
    product/            # product-form, product-card, product-detail-client
    dashboard/          # chart-export, profit-chart
    sales/              # sale-dialog, sale-row
    layout/             # app-header, bottom-nav
    ui/                 # shadcn primitives + copyable-sku
  lib/
    actions/            # Server Actions (product-actions, sale-actions)
    queries/            # DB queries (products, sales, dashboard, stats)
    stockx/client.ts    # Client StockX API (OAuth2, search, variants)
    db/schema.ts        # Drizzle schema
    utils/              # format, constants, calculations
```

## Conventions

### Images
- Utiliser `next/Image` avec `fill` + `sizes` pour les images produit (jamais `<img>` brut)
- Conteneur image : `relative h-20 w-20 rounded-lg overflow-hidden bg-white`
- Classe image : `object-contain p-1`
- Config `next.config.ts` : `images.remotePatterns` pour `images.stockx.com` et `cdn.discordapp.com`

### Couleurs (CSS variables dans globals.css)
- `--background: #18191E` / `--card: #24262D` / `--primary: #C9CEEE`
- `--success: #4ADE80` / `--warning: #FB923C` / `--danger: #F87171`

### Composants réutilisables
- `CopyableSku` — SKU cliquable avec copie clipboard (`src/components/ui/copyable-sku.tsx`)
- `StatusBadge` — Badge statut coloré
- `TimeBadge` — Badge temps en stock (vert/orange/rouge)
- `ReturnDeadlinePicker` — Sélecteur date retour (14j/30j/custom)

### Formulaire produit (product-form.tsx)
- Wizard : "search" → "sizes" → submit (ou "manual" pour non-StockX)
- Auto-search debounce 1000ms sur l'input
- Résultats StockX affichés inline avec images
- SKU détecté par regex `/^[A-Za-z0-9]+-[A-Za-z0-9]+$/` → lookup direct
- Texte libre → recherche catalog StockX → résultats multiples

### Fichiers download (SPA-safe)
- Toujours utiliser `fetch()` + `blob()` + `<a>` invisible (jamais `window.location.href`)

### Cache
- `.next` peut devenir stale → `rm -rf .next` si comportement bizarre
- StockX products cachés en DB (`stockx_cached_products` table)

## StockX API
- OAuth2 tokens stockés dans table `stockx_tokens`
- Admin auth via `/api/stockx/auth` (une seule fois)
- Auto-refresh token quand expiré (12h)
- Endpoints : `/api/sku-lookup` (SKU → image+tailles), `/api/stockx/search` (texte → produits)
- Images : construites depuis le `variantSlug` du premier variant (`testImageUrls()`)

## Commandes
- `npm run dev` — serveur dev
- `npx drizzle-kit push` — appliquer schema DB
- `npx tsc --noEmit` — vérification TypeScript

## État d'avancement
- Étapes 1-8 : Auth, CRUD stock, ventes, dashboard, stats, filtres, exports, multi-variants
- Étape 9 : Search UX (debounce 1000ms, résultats inline, images StockX, product card alignée)
- En cours : améliorations UX continues
