import { viewportBucket, type EventName } from '@/lib/analytics/events';

/** Fire-and-forget. Skipped when the browser signals Do Not Track or Global Privacy Control. */
export function trackEvent(name: EventName): void {
  try {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.doNotTrack === '1' || nav.globalPrivacyControl) return;
    const body = JSON.stringify({ event: name, viewport: viewportBucket(window.innerWidth) });
    if (!(typeof nav.sendBeacon === 'function' && nav.sendBeacon('/api/events', new Blob([body], { type: 'application/json' })))) {
      void fetch('/api/events', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true });
    }
  } catch {
    /* measurement must never break the page */
  }
}
