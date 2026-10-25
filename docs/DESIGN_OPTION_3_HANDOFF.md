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
