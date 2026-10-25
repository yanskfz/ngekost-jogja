# Ngekost Jogja

Marketplace kost dan kontrakan untuk Sleman dan Kota Jogja. Next.js + TypeScript, siap untuk Vercel.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm start          # serve the production build
npm run typecheck
npm test
```

Environment variables are documented in `.env.example`; the app builds without them. Structure and provider
boundaries are described in `docs/FOUNDATION.md`.

The earlier static demo lives in `prototype/` (`npm run prototype`) as a migration reference only.

## Status

Task 1 (foundation) is implemented. Features, database schema, auth, and moderation follow `IMPLEMENTATION_PLAN.md`.
