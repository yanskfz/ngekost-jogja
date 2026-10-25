# Trust and Discovery iteration (branch `claude/trust-discovery-iteration`)

## Commands run
`npm run typecheck`, `npm test` (unit), `npm run build`, `npm audit`, `npm run qa:e2e` (Playwright + axe-core, Chromium), plus three manual Lighthouse mobile runs. Exact counts are in the summary at the top of this file.

## Requirements preflight
Read first: `Ngekost-Jogja-Trust-and-Discovery-System-Design.docx` and `artifact.md` (Google Drive, not in the repository), `BRIEF.md`, `docs/DESIGN_OPTION_3_HANDOFF.md`, `CLAUDE.md`. Applied the Karpathy rules (assumptions stated, smallest testable change, verifiable result) and Ponytail rules (callers, security boundaries, missing tests, skipped items stated).
Acceptance criteria frozen before coding: the nine approved additions render and behave as described in `docs/TRUST_AND_DISCOVERY.md`; exact coordinates and the private address never reach the browser; location is optional and one-shot; the 3-of-5 gate still holds under every new filter, sort, report, and direct URL; no new imagery; the preview stays read-only.
Assumptions and open decisions are listed in `docs/TRUST_AND_DISCOVERY.md` and `BRIEF.md`.

## Ponytail-style trace
Callers of the changed code: `toPublicListing` (every public read path: preview cards, detail, dev adapter), `listPreviewCards` (home, detail, report page, report action, QA fixtures), `gateListings`/`canViewListing` (home, detail, report page and action), `ListingCard` (now rendered from a client component, so nothing in it may import Node-only code; `lib/data/constants.ts` and `lib/location/geo.ts` were split out for that), `acceptSafetyConsent`/`demoSignIn` (now also emit server-side events). Security boundaries re-checked: consent gate (version bump invalidates v1 and forged cookies; E2E covers both), anonymous gate (filters, sort, search, report, and report-page URLs cannot surface or touch locked listings), report action (id allowlist, public-and-viewable check, honeypot, length limits), events endpoint (allowlist, size limit, no body logged beyond the name and a viewport bucket).

## Bug reproduction log (this iteration)
| Bug | Severity | How found | Regression test (kept) | Before fix | After fix | Residual risk |
| --- | --- | --- | --- | --- | --- | --- |
| Browsers without a geolocation object: the "nearest" button threw instead of showing a message (`'geolocation' in navigator` was true for an undefined value) | P1 | New negative test written first | `Location unsupported: a clear message and the list is unaffected` | FAIL | PASS | Real browsers vary; only a stubbed environment was tested. |
| Listing photos carried the mockup's heart button (a white disc) baked into the image corner, so the detail gallery showed a fake control | P1 | Visual audit of the detail screenshot (the DOM checks and earlier QA did not catch it) | `Photo assets contain no baked-in UI` (counts near-white pixels in each photo's top-right corner) | White share 0.37 in four of six photos | 0 in all six (re-cropped; manifest updated) | The check only looks at one corner; other baked-in UI would need its own check. |
| Favorite button persisted check raced hydration after the list became a client component | P3 | E2E failure | existing `Favorite persists...` now waits for the stored state | FAIL (test timing) | PASS | Test-only. |
| Report-action 404 probes were attributed to the tracked page and polluted console-error tracking | P3 | E2E failure | 404 checks use untracked requests | FAIL (test setup) | PASS | Test-only. |
Earlier tests were kept; none was removed or weakened.

## Change request during visual review: one-line card address
Product Owner asked that list-card addresses be limited to one line with an ellipsis and show the kecamatan and region. Tests were written first and failed (the one-line address element did not exist, so the E2E runner timed out on it; 12 unit cases failed because `compactLocation` was missing). After the change: 12 new unit cases and 8 new E2E checks pass (kecamatan text, one line with an ellipsis on the real and the stress cards, tooltip and screen-reader text keep the full label, the detail page keeps the full label, the 160-character address becomes "Kec. Depok, Kab. Sleman"). The card geometry check no longer treats the intentional ellipsis as overflow; every other overflow check is unchanged. Screenshot: `docs/qa-screenshots/16-stress-cards-address-390.png`.

## Lighthouse (mobile, localhost production build, single runs)
- Homepage, consented: Performance 87, Accessibility 100, Best Practices 96; LCP 2.7 s, CLS 0, TBT 380 ms, 200 KiB. Down from 91 before this iteration (the card list became a client component and cards carry more markup); still above the 85 target, with little margin.
- Detail page (`/listing/lst-2`): Performance 99, Accessibility 100, Best Practices 96.
- First-visit modal: Performance 98, Accessibility 100, Best Practices 96.
These are not Vercel measurements.

## Visual audit
11 new or refreshed screenshots in `docs/qa-screenshots/` (`10-` to `15-`, plus the earlier set) were inspected by the implementing agent: evidence rows and fee notes fit inside cards at 390 px, the modal is concise, the filter panel, report form, map section, and detail status/evidence panels render without clipping. The audit also found the baked-in heart overlay (above). Fidelity to a reference design for these new screens does not exist (they are new), so visual approval is the Product Owner's.

## Not tested / residual risks
- Only Chromium; no Firefox/WebKit; no screen reader. An accessibility-tree smoke and axe WCAG A/AA on the new pages are the only a11y automation.
- Real geolocation accuracy and permission prompts differ per browser; only the granted, denied, and unsupported paths in Chromium were exercised.
- The OpenStreetMap embed was exercised against a stub (the sandbox should not depend on a third party); the real embed's rendering, cookies, and policy compliance are untested. The public OSM tile/embed usage policy is still an open question in `BRIEF.md`.
- Jitter quality was tested for distance and determinism, not against a determined adversary; the development secret is public.
- Events are logged to stdout only; counts are not durable and were not reconciled against a dashboard.
- The report flow is a per-browser demo; durability, SLA, and admin review are not built.
- The nine additions were not independently QA'd; this report is the implementing agent's.

---

# Previous iteration notes (PR #2)


## Commands run
`npm run typecheck`, `npm test` (28 unit tests), `npm run build`, `npm run qa:e2e`, `npm audit` (0 vulnerabilities).

## Requirements preflight (frozen before the visual-fix run)
Read: `BRIEF.md` and `docs/DESIGN_OPTION_3_HANDOFF.md` (iteration 2 hard requirements, responsive visual acceptance, QA workflow).
Assumptions: the reference images are the visual source of truth; no new imagery may be generated (crop/resize/compress only); palette, hierarchy, and homepage sections must not change without product-owner approval; demo sign-in and dummy data are preview behavior only.
Scope of this fix (smallest testable change): (1) listing cards must not clip or overflow at 320/390/768/1024/1440 px; (2) category/trust (and warning/modal) assets need visible separation from their parent surface; (3) add regression E2E for long title/address, empty facilities, monthly/yearly price, mobile screenshots, and asset boundary; (4) record PASS/FAIL/BLOCKED with severity.
Known risks: cropped assets are limited to mockup resolution; only Chromium is available; no screen reader.
Verifiable result: every row below is PASS, or is listed BLOCKED with the reason.

## Ponytail-style trace of the changed flow
Callers of the changed code: `ListingCard` (home, QA fixture page), `app/globals.css` card/asset rules, the detail page price markup (`card__amount`/`card__period`). Security boundaries are unchanged by this fix: consent gating and the 3-of-5 gate were not touched, and their E2E rows still pass. New surface: `/qa/cards`, which renders synthetic data and returns 404 unless `QA_FIXTURES=1`; the E2E starts a second server without the variable and asserts the 404.

## Findings from review and how this run addresses them
| Priority | Finding | Resolution in this run |
| --- | --- | --- |
| P1 | Possible text/card clipping on mobile | Not reproducible on real data at 390 px. Stress cards reproduced real defects: at 320 px a Rp 1.250.000.000 price was split mid-number ("Rp 1.250.000.0 / 00") and overflowed its box (144 px in 140 px). Fixed: unbreakable amount, narrower photo column and smaller price at <= 359 px, `overflow-wrap` on titles/addresses/facilities. Geometry + screenshot checks now pass at all five viewports. |
| P2 | Category asset blends into the parent card | Fixed without new imagery or palette change: removed `mix-blend-mode: multiply` on category, trust, warning and modal images; added a white tile ring plus a thin dark outline (category), a circular outline (trust), and rounded corners with a white ring (warning, modal). A pixel check measures colour distance across each edge. |
| P1 | 95/95 E2E was run by the implementer | Still true for this report. Listed as BLOCKED until the independent run. |
| P2 | No screen-reader or cross-browser test | BLOCKED (not available here). An accessibility-tree smoke and axe WCAG A/AA were added as partial coverage. |
| P2 | No screenshot audit for modal, gate, detail, unlocked | 11 screenshots captured in `docs/qa-screenshots/` and reviewed by the implementer; independent review pending. |
| P1 (public launch) | Demo sign-in is not real auth; data is dummy | Expected limitation, unchanged. |

Visual audit notes (implementer review of the screenshots): text, prices, facilities, chevron, and photo stay inside every card at 320 and 390 px; long unbroken words wrap instead of clipping; yearly and monthly periods both render; an empty facilities list leaves no gap. Remaining visual judgement (fidelity to the reference, whether the tile outlines are acceptable) is the product owner's approval to give.

## Bug reproduction log (living regression suite)
Method: the new suite was run against the code from before the fix (`08f338f`, same E2E and the QA-only fixture route) and failed; the same suite passes after the fix.

| Bug | Severity | Regression test (kept in the suite) | Before fix | After fix | Residual risk |
| --- | --- | --- | --- | --- | --- |
| Long unbroken words and long addresses overflow the card body (706 px text in a 154–199 px box) and leave the card | P1 | `Card layout: no clipping or overflow at {320,390,768,1024,1440}px` on 7 stress cards | FAIL at all 5 viewports | PASS | Only synthetic worst cases were tried; real user content may differ. |
| Empty facilities still rendered an empty list element | P2 | `Edge case: card with empty facilities renders no facilities list and no empty gap` | FAIL (`1,1,1,1,1,1,1`) | PASS | None known. |
| Category/trust/warning images used `mix-blend-mode: multiply` and dissolved into their parent surface | P2 | `Asset blending: ...do not use blend modes that dissolve their boundary` plus `Asset boundary: ... min edge colour distance >= 20` | Blend rule FAILED. The pixel-distance check PASSED on the old code, so by itself it is a weak guard; it is kept because it still catches a tile that matches its parent at the edges. | PASS | Whether the outlined tiles look right is a visual judgement for the product owner. |
| Prices split mid-number or overflowed at 320 px (`Rp 1.250.000.0 / 00`, 144 px in 140 px) | P1 | `Edge case: price amounts are never split across lines` (390 and 320 px) and the 320 px card-overflow check | Introduced and caught inside this fix cycle (an intermediate `overflow-wrap: anywhere`); it never existed on `main`. The overflow check failed on it (144>140) before the final fix. The split-amount test was added with the fix and was not separately run against that intermediate state. | PASS | Extreme prices beyond Rp 1.25 miliar at 320 px are untested. |

Earlier tests were all kept; none was removed or weakened.

## Lighthouse (mobile, localhost production build, run once manually)
- Consented homepage (re-run after the visual fixes): Performance 91, Accessibility 100, Best Practices 96. LCP 2.5 s, CLS 0, TBT 300 ms, 200 KiB.
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
- Category icons now sit in an outlined white tile and trust icons in an outlined circle (to meet the asset-separation rule); this changes how the sliced art meets its card but not the art, palette, or hierarchy. Needs product-owner visual approval.
- Warning card keeps the reference copy plus one sentence required by BRIEF.md (no payments processed, no transaction guarantee).
- Heart buttons are real toggles stored only in the visitor's own browser (localStorage); nothing is sent or shared.
- Listings 3, 9, and 10, the locked gate, the sign-in page, the listing detail, and the filter chips are not in the reference and reuse its visual language and existing crops.
- The modal is a concise adaptation of the anti-scam card in the modal reference screenshot (same warning icon, colors, and illustration), with a checkbox, a disabled-until-checked action, and a collapsible full guide.
- Fidelity was judged by eye on a 390 px screenshot against the reference; no pixel diff was run.

## Not verified
- No Vercel preview was checked and nothing was deployed.
- Cross-browser testing beyond Chromium was not done.
- No screen reader testing; accessibility is covered by axe-core WCAG A/AA, keyboard focus and touch-target checks only.


## Independent QA confirmation

Executed separately by the product-owner QA session in a clean worktree, without modifying application code:

- `npm ci` and `npm run build`: PASS; `/qa/cards` route registered.
- `npm run typecheck`: PASS.
- `npm test`: 28/28 PASS across 4 files.
- `npm audit`: 0 vulnerabilities.
- `npm run qa:e2e`: exit code 0, 133 PASS, 0 FAIL, 3 BLOCKED; repeated twice with identical results.
- The 3 BLOCKED checks remain environment limitations: Firefox/WebKit, screen-reader testing, and product-owner visual approval.
- Initial port availability check was not counted because `ss` was unavailable; E2E completed normally.
- Independent QA did not assess or approve visual fidelity. Product-owner visual approval remains pending.
