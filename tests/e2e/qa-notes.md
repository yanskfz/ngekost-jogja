
## Commands run
`npm run typecheck`, `npm test` (28 unit tests), `npm run build`, `npm run qa:e2e`, `npm audit` (0 vulnerabilities).

## Lighthouse (mobile, localhost production build, run once manually)
- Consented homepage: Performance 91, Accessibility 100, Best Practices 96. LCP 2.6 s, CLS 0, TBT 280 ms, 200 KiB.
- First-visit consent modal: Performance 93, Accessibility 100, Best Practices 96. LCP 2.2 s, CLS 0, TBT 270 ms, 134 KiB.
Both meet the >= 85 target locally. Single localhost runs with simulated throttling, not Vercel measurements.

## Iteration 2 behavior implemented
- Blocking consent modal: the layout renders only the brand and the modal until the `nk_safety_consent` cookie equals the current consent version; every page also refuses to produce content without it (Next otherwise serializes a page the layout skips into the payload, which an earlier QA run caught). The cookie is set by a server action that re-checks the posted checkbox, so a force-enabled button cannot bypass it.
- The contact-point warning is still shown directly above the WhatsApp CTA on the detail page.
- Anonymous limit: the first 3 of the 5 public dummy listings are the only ones the server ever reads for anonymous visitors, before search or filters. The gate component receives a count, never listing data. Direct URLs for the 4th and 5th listing render a locked page without their data. Verified with JavaScript disabled too.
- Demo sign-in sets a server-side HttpOnly cookie and collects no personal data. It is NOT authentication: anyone can sign in to the demo, and the cookie value is not secret. Real enforcement needs hosted auth (see `docs/PUBLIC_LAUNCH_DATABASE.md`).
- Assets: no image was generated. `scripts/slice-assets.py` crops the committed references into `public/images/`, and `docs/DESIGN_ASSET_MANIFEST.md` lists source, crop box, size, and bytes for each. The warning illustration now comes from the higher-resolution modal reference screenshot.

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
- Listings 3, 9, and 10, the locked gate, the sign-in page, the listing detail, and the filter chips are not in the reference and reuse its visual language and existing crops.
- The modal is a concise adaptation of the anti-scam card in the modal reference screenshot (same warning icon, colors, and illustration), with a checkbox, a disabled-until-checked action, and a collapsible full guide.
- Fidelity was judged by eye on a 390 px screenshot against the reference; no pixel diff was run.

## Not verified
- No Vercel preview was checked and nothing was deployed.
- Cross-browser testing beyond Chromium was not done.
- No screen reader testing; accessibility is covered by axe-core WCAG A/AA, keyboard focus and touch-target checks only.
