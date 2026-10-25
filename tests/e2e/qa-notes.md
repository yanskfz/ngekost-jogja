
## Commands run
`npm run typecheck`, `npm test` (23 unit tests), `npm run build`, `npm run qa:e2e`, `npm audit` (0 vulnerabilities).

## Lighthouse (mobile, localhost production build, run once manually)
Performance 96, Accessibility 100, Best Practices 96. LCP 2.3 s, CLS 0, TBT 170 ms, 196 KiB total transfer.
Meets the >= 85 target locally. This is a single localhost run with simulated throttling, not a Vercel measurement.

## Visual fidelity to the Option 3 reference
Implemented to follow the approved reference (product decision is not the implementer's):
- Logo, hero illustration (Tugu/mountain), category house icons, trust icons, the two listing photos, the warning illustration, and the footer scene are cropped from the committed reference image into WebP assets (`public/images/`, ~100 KB total). Icons that are plain controls (menu, search, arrows, pins, hearts, facility icons) use lucide-react.
- The first two dummy listings were aligned to the reference content (Kost Puri Timoho, Rp 1.300.000 / bulan; Rumah Kontrakan Sari Asri, Rp 18.000.000 / tahun) via fixture data and a new `price_period` field.
- The reference canvas (853 px) is treated as ~2x a 390 px viewport: type and spacing are scaled by ~0.5 with a 12 px minimum.
- Palette sampled from the reference: #faf9f6, #dee7d6, #fdd76b, #fee7ad, #fce3e1, #21613c, #240020.

Known differences from the reference image:
- Fonts are a system stack, not the rounded display font in the mockup (handoff allows system or one external font).
- Cropped artwork has its background baked in; it is blended with `mix-blend-mode: multiply` and a mask, so edges can differ slightly. Resolution is limited to the reference's native 853 px canvas (photos 308 px wide), so images are softer on high-DPR screens until final assets are supplied.
- Handwritten footer quote uses a system cursive font and has no yellow underline stroke.
- Warning card keeps the reference copy plus one sentence required by BRIEF.md (no payments processed, no transaction guarantee).
- Heart buttons are real toggles stored only in the visitor's own browser (localStorage); nothing is sent or shared.
- Listing 3 (kost, third card) is not in the reference and reuses the kost photo. Listing detail and the filter chips are not in the reference and use the same visual language.
- Fidelity was judged by eye on a 390 px screenshot against the reference; no pixel diff was run.

## Not verified
- No Vercel preview was checked and nothing was deployed.
- Cross-browser testing beyond Chromium was not done.
- No screen reader testing; accessibility is covered by axe-core WCAG A/AA, keyboard focus and touch-target checks only.
