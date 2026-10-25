# Design Handoff — Option 3

Status: approved visual direction for iterative implementation
Date: 2026-10-25
Owner: Product owner
Implementation owner: Claude Code

## Source of truth

Visual reference: [Option 3 reference](../exec-7a0e29e2-9727-45d9-ad17-9d62027cd564.png)

This document defines the design/code handoff. Do not replace the reference direction without product-owner approval.

## Product intent

Ngekost Jogja is a mobile-first marketplace for kost and kontrakan in Sleman and Kota Jogja. The experience should feel friendly, local, and trust-first.

Primary user outcome: a visitor can find a relevant listing quickly and understand the anti-scam safeguards before contacting a submitter.

## Visual direction

- Friendly local Jogja marketplace.
- Palette: sage green, warm yellow, off-white, dark plum.
- Primary viewport: 390x844.
- Responsive desktop behavior is required.
- Keep the interface lightweight; avoid heavy animation, video, and large blocking assets.
- Use a real icon library. Do not use emoji, CSS drawings, or screenshot-as-UI.

## Homepage requirements

1. Compact brand/header with a menu control.
2. Hero headline: “Temukan tempat tinggal nyaman di Jogja”.
3. Supporting copy mentions verified kost and kontrakan in Sleman and Kota Jogja.
4. Search field for location, campus, or area.
5. Two category actions: “Cari Kost” and “Cari Kontrakan”.
6. Trust checklist:
   - Minimal 3 foto.
   - WhatsApp bisa dihubungi.
   - Di-review admin.
7. Recommended listing section using the existing approved dummy listings.
8. Prominent anti-scam warning: never transfer money before direct viewing and independent verification.
9. Owner CTA may be shown, but must not imply persistent public submissions until hosted database/auth/storage are enabled.

## Listing behavior

- Preserve the existing approved, non-expired dummy listing rules.
- Listing cards show photo, type, title, area, price, period, and selected facilities.
- Do not show WhatsApp directly on cards.
- Detail view may show WhatsApp only when approved and contact consent exists.
- Keep the current read-only/dummy-data notice.
- No payment, booking, deposit, subscription, or transfer flow.

## Performance requirements

- Lazy-load below-the-fold images.
- Use responsive image dimensions and prevent layout shift.
- Keep the initial JavaScript and asset payload minimal.
- Avoid a map library in the initial homepage load; map can be lazy-loaded later.
- Use system font or at most one external font.
- No autoplay video.
- Target mobile Lighthouse performance >= 85.

## Accessibility requirements

- Visible keyboard focus states.
- Keyboard-operable controls.
- Form controls have labels.
- Icon-only controls have accessible names.
- WCAG AA contrast target.
- Minimum touch target around 44px.
- No horizontal overflow at 390x844.

## QA gate

Before handoff or redeploy, Claude Code must:

- Run typecheck, tests, and production build.
- Run E2E checks for homepage load, search, filters, empty state, listing detail, mobile layout, and anti-scam warning.
- Confirm no production console errors.
- Confirm no failed critical network requests.
- Run an accessibility smoke check.
- Save results in `design-qa.md`.
- Do not deploy until the visual implementation and E2E QA pass.

## Approval gate

Design changes that alter the palette, hierarchy, trust messaging, homepage sections, or primary search flow require product-owner approval before implementation.

## Hard requirements — iteration 2

These requirements are mandatory for the next implementation and override any earlier interpretation of the anti-scam banner or anonymous access.

### Blocking anti-scam consent modal

- The long inline anti-scam copy must not be the only protection.
- On first entry to the public experience, show a blocking modal before the user can browse or contact listings.
- The modal must be concise and scannable. Keep the full safety explanation available behind a “Baca panduan lengkap” disclosure or link.
- The modal cannot be dismissed by clicking outside, pressing Escape, or using a close icon before consent.
- Consent must be an explicit unchecked checkbox, for example: “Saya paham dan akan verifikasi langsung sebelum membayar.”
- The primary action remains disabled until the checkbox is checked.
- The user must click an explicit action such as “Saya paham, lanjut melihat listing” to close the modal.
- Do not pre-check the checkbox.
- Keyboard users must be able to reach the checkbox and primary action; focus must remain inside the modal while it is open.
- On the dummy/read-only preview, store only the local consent state needed to avoid reopening on every page navigation. Do not claim this is production consent storage.
- In the hosted product, consent must be recorded with timestamp, consent text version, and account/session identifier before allowing the protected experience.
- The warning must appear again at the WhatsApp/contact action. Modal consent does not remove the contact-point warning.

### Anonymous listing limit

- Seed five public dummy listings for this iteration.
- An unauthenticated visitor can see exactly three complete listing results.
- The fourth and fifth results must be represented by a clear locked teaser or access gate; do not expose their full detail, photos, WhatsApp, or private fields.
- The gate must explain that signup/login is required to view the remaining two listings.
- After successful signup/login, the user can see all five public listings.
- This limit applies to listing results and recommendation sections; it must not be bypassed by direct listing URLs, query parameters, or client-side-only hiding.
- While the app is still read-only/dummy, implement the state boundary explicitly and label signup as preview/demo behavior if persistence is unavailable.
- Do not collect payment, deposit, booking fee, or transfer data as part of the gate.

### Asset and image-generation policy

- Claude Code must not generate new images or use ImageGen for this iteration.
- Use only the committed Option 3 reference, the newly committed anti-scam screenshot reference, and existing repository assets.
- Asset slicing/cropping is required where the reference contains reusable visual elements: hero art, logo, category cards, trust icons, listing photos, warning illustration, and footer art.
- Cropping, resizing, WebP conversion, compression, color correction, and small cleanup are allowed.
- Do not create substitute illustrations, new characters, new backgrounds, generic stock images, or screenshot-as-UI.
- Keep an asset manifest mapping each output asset to its source image and crop/transform. Add or update docs/DESIGN_ASSET_MANIFEST.md.
- Every shipped image must have fixed dimensions/aspect-ratio behavior, an appropriate alt, and lazy loading when below the fold.
- Asset backgrounds must remain visually distinct from their parent surface. No icon tile, crop, mask, or color-correction may blend into a card so strongly that the asset boundary or meaning becomes unclear.
- Category and trust assets require a visible separation from their card background, with no unintended overlap, clipping, or color collision at the primary 390x844 viewport.

### Responsive visual acceptance

- At 320x640, 390x844, 768x1024, 1024x768, and 1440x900, no text, price, facility, CTA, card edge, or icon may be clipped horizontally.
- Listing cards must keep photo, metadata, price, and navigation affordance inside the viewport; no content may rely on horizontal scrolling.
- Long titles, long addresses, missing optional facilities, and both monthly/yearly price periods must render without breaking the card layout.
- The category cards and trust checklist must retain readable text and clear asset separation at each required viewport.
- A screenshot audit must inspect the initial viewport and the listing section at 390x844. A passing DOM/overflow check alone is insufficient for visual acceptance.

### Required QA workflow and evidence

Before declaring E2E green:

1. Requirements preflight: read `BRIEF.md` and this handoff; list assumptions, acceptance criteria, and known risks.
2. Karpathy check: prefer the smallest testable change, state ambiguity, and define a verifiable result.
3. Ponytail review: trace the changed flow, callers, security boundaries, and missing tests; do not review only the diff.
4. Product Design Audit: capture and inspect screenshots for the modal, consented homepage, listing section, detail page, locked gate, and demo-unlocked state.
5. Execute E2E in three categories:
   - Happy path: consent, browse, search, filters, open detail, see contact warning, demo unlock.
   - Edge cases: 0 results, last/first listing, mixed filters, long title/address, missing optional data, refresh, direct URLs, 320/390/768/1024/1440 viewports, JS disabled.
   - Negative/security: unchecked consent submission, Escape/backdrop/refresh/direct-URL bypass, query/client-state bypass, locked data absent from HTML, non-public listings blocked, no WhatsApp before approval/consent, no payment or transfer collection, no PII leakage.
6. Record every scenario as PASS, FAIL, or BLOCKED with evidence and a severity/priority.
7. Run the independent QA pass separately from implementation; an implementer-generated report is not independent evidence.
8. Re-run the targeted regression tests after each fix and update `design-qa.md`.

### Severity and priority

- P0 / Blocker: security or data-exposure failure, consent bypass, payment/transfer risk, or the app cannot load.
- P1 / High: core mobile journey broken, listing/content clipped, locked listing exposed, or contact safety warning missing.
- P2 / Medium: visual hierarchy/contrast issue, accessibility issue with a viable workaround, or an important edge case not covered.
- P3 / Low: polish, copy, minor fidelity, or non-critical cross-browser difference.

## New acceptance tests

- First visit opens the blocking safety modal.
- Modal cannot close before explicit checkbox consent.
- Escape, backdrop click, and browser refresh before consent do not bypass the modal.
- After consent, the listing experience is accessible.
- Anonymous state exposes exactly three complete listings and one locked gate for the remaining two.
- Direct navigation to the fourth/fifth listing does not bypass the anonymous limit.
- Authenticated/demo-unlocked state exposes all five listings.
- Visual asset separation and no clipping are checked with screenshots at 390x844.
- E2E verifies the above at 390x844 and records results in design-qa.md.
