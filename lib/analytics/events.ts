/**
 * Privacy-minimal funnel events. No cookies, user ids, IPs, or listing ids are attached; each event is only a name.
 * Definitions (see docs/METRICS.md):
 *   consent completion  = consent_accepted / consent_shown
 *   consent abandonment = consent_abandoned / consent_shown
 *   sign-up conversion  = signup_completed / gate_shown
 */
export const EVENT_NAMES = ['consent_shown', 'consent_accepted', 'consent_abandoned', 'gate_shown', 'signup_started', 'signup_completed'] as const;
export type EventName = (typeof EVENT_NAMES)[number];

export function isEventName(v: unknown): v is EventName {
  return typeof v === 'string' && (EVENT_NAMES as readonly string[]).includes(v);
}

/** Server-side sink: one JSON line to stdout (visible in Vercel logs). The preview has no database. */
export const VIEWPORTS = ['sm', 'md', 'lg'] as const;
export type Viewport = (typeof VIEWPORTS)[number];
export const isViewport = (v: unknown): v is Viewport => typeof v === 'string' && (VIEWPORTS as readonly string[]).includes(v);

/** Coarse screen bucket (no exact size) so the consent funnel can be compared by device class. */
export function viewportBucket(widthPx: number): Viewport {
  return widthPx < 640 ? 'sm' : widthPx < 1024 ? 'md' : 'lg';
}

export function logEvent(name: EventName, viewport?: Viewport, now: Date = new Date()): void {
  console.info(JSON.stringify({ type: 'nk_event', name, ...(viewport ? { viewport } : {}), at: now.toISOString() }));
}
