# Foundation (Task 1)

## Stack

Next.js (App Router) + TypeScript, deployed to Vercel (`vercel.json` sets `framework: nextjs`).
Supabase is the planned data/auth/storage layer; OpenStreetMap-compatible tiles are the planned map source.

## Layout

| Path | Purpose |
| --- | --- |
| `app/` | Next.js routes. Only a placeholder home page exists; product UI arrives in later tasks. |
| `lib/env.ts` | Single place that reads environment variables. Blank values count as unset. |
| `lib/supabase/client.ts` | Browser/anon Supabase client. Safe for client components; subject to RLS. |
| `lib/supabase/server.ts` | Server-only clients (`server-only` import): anon server client and the service-role client. |
| `lib/map/adapter.ts` | Map adapter boundary: tile URL template, attribution, default Jogja view. No map library or secret is bundled yet. |
| `supabase/` | Reserved for migrations (Task 2). |
| `prototype/` | The previous static demo (localStorage). Kept as a migration reference only; not deployed. |
| `tests/` | Foundation tests (`npm test`). |

Application code must reach Supabase and the map provider only through `lib/supabase/*` and `lib/map/*`.

## Commands

```bash
npm install
cp .env.example .env.local   # optional; the app builds without any values
npm run dev                  # http://localhost:3000
npm run typecheck
npm test
npm run build && npm start   # production build and server
npm run prototype            # old static demo at http://localhost:4173
```

## Environment variables

See `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be prefixed `NEXT_PUBLIC_`.
The default map tile URL is the public OSM tile server, which is acceptable for development only; its usage policy
must be reviewed before production (see BRIEF.md Open questions).

## Prototype decision

The static prototype was moved to `prototype/` rather than deleted so the data contract and UI remain available
while later tasks migrate behavior. `vercel.json` no longer points at `public/`.
