# Proxcop Dashboard

Dashboard de gestion de stock pour la communaute Proxcop (~200 membres resellers).

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **shadcn/ui** + **Tailwind CSS** (dark theme Proxcop)
- **Drizzle ORM** + **Neon PostgreSQL**
- **Auth.js v5** + Discord OAuth2 (verification serveur)
- **Cloudflare R2** (images)
- **Recharts** (graphiques)
- **Vercel** (deploy)

## Setup

```bash
# 1. Installer les deps
npm install

# 2. Copier les variables d'environnement
cp .env.example .env.local
# Remplir les variables dans .env.local

# 3. Generer le schema DB
npx drizzle-kit push

# 4. Lancer le dev server
npm run dev
```

## Variables d'environnement

Voir `.env.example` pour la liste complete. Services requis :

1. **Discord** : discord.com/developers > New Application > OAuth2
2. **Neon** : neon.tech > Create Project
3. **Cloudflare R2** : dash.cloudflare.com > R2 > Create Bucket
