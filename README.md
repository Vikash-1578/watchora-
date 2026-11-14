# Watchora (website)

Watch movies, web series, anime, drama and TV serials. No sign-up for viewers.

- **Frontend:** React + Vite, hosted on Cloudflare Pages
- **API:** Cloudflare Pages Functions (`functions/api/[[path]].js`)
- **Database:** Cloudflare D1 (`watchora-db`), schema in `schema.sql`
- **Videos:** embedded from external hosts (several servers per title)
- **18+ section:** separate page at `/18plus` with an age check; main site only links to it
- **Admin panel:** `/admin`, protected by the `ADMIN_PASSWORD` secret

## Cloudflare Pages settings

- Build command: `npm run build`
- Output directory: `dist` (also set in `wrangler.toml`)
- D1 binding `DB` → `watchora-db` (set in `wrangler.toml`)
- Secret: `ADMIN_PASSWORD` (Settings → Variables and Secrets, type "Secret")
- Optional secret: `TMDB_API_KEY` turns on auto-fill in the admin panel (TMDB free keys are non-commercial)



## Local development

```
npm install
echo 'ADMIN_PASSWORD="local-pass"' > .dev.vars
npx wrangler d1 execute watchora-db --local --file=schema.sql
npm run build && npx wrangler pages dev dist
```

The previous Android project lives in this repo's git history (commit `2cf9717`).
