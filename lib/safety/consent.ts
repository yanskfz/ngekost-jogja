import { cookies } from 'next/headers';

// Preview-only consent state: an HttpOnly cookie set by a server action. The hosted product must instead record
// consent with timestamp, consent text version, and account/session id (see docs/PUBLIC_LAUNCH_DATABASE.md).
export const SAFETY_CONSENT_COOKIE = 'nk_safety_consent';
// v2: concise three-action copy (Trust and Discovery iteration). Bumping the version asks everyone to consent again.
export const SAFETY_CONSENT_VERSION = '2026-10-v2';
export const SAFETY_CONSENT_MAX_AGE = 60 * 60 * 24 * 30;

export async function hasSafetyConsent(): Promise<boolean> {
  return (await cookies()).get(SAFETY_CONSENT_COOKIE)?.value === SAFETY_CONSENT_VERSION;
}

/**
 * Pages call this first. The layout alone is not enough: Next still runs a page that the layout declines to render
 * and serializes its output into the response payload, so each page must refuse to produce content without consent.
 */
export async function consentMissing(): Promise<boolean> {
  return !(await hasSafetyConsent());
}
