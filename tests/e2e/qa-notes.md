
## Commands run
`npm run typecheck`, `npm test` (22 unit tests), `npm run build`, `npm run qa:e2e`, `npm audit` (0 vulnerabilities).

## Lighthouse (mobile, localhost production build, run once manually)
Performance 89, Accessibility 100, Best Practices 96. LCP 2.2 s, CLS 0, TBT 410 ms, 124 KiB total transfer.
Meets the >= 85 target locally. This is a single localhost run with simulated throttling, not a Vercel measurement.

## Deviations from the Option 3 reference (for product-owner visual approval)
- The reference artwork (Tugu Jogja/mountain illustration, girl illustration, village footer scene, logo mark) is not reproduced; a minimal inline SVG hero shape and a text footer stand in. Final artwork needs to be supplied as assets.
- Listing photos are static placeholder SVGs because the dummy data has no real photos. Real photos arrive with image storage.
- Favorite (heart) buttons are omitted: no favorites feature exists and the preview is read-only.
- The listing card shows facilities from the dummy data (e.g. kamar mandi, Wi-Fi, parkir) instead of the "1 kamar" counts in the reference; bedroom counts are not in the data model.
- System font stack is used (no external font).
- No pixel-level comparison against the reference image was done; fidelity was checked by eye on a 390px screenshot only.
- Owner CTA is not shown, so nothing implies persistent public submissions.

## Not verified
- No Vercel preview was checked and nothing was deployed.
- Cross-browser testing beyond Chromium was not done.
- No screen reader testing; accessibility is covered by axe-core WCAG A/AA, keyboard focus and touch-target checks only.
