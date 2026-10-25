'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isViewport, logEvent } from '@/lib/analytics/events';
import { DEMO_SESSION_COOKIE, DEMO_SESSION_VALUE, isDemoSignedIn } from '@/lib/auth/demo-session';
import { canViewListing } from '@/lib/data/access';
import { listPreviewCards } from '@/lib/data/preview';
import { getReportedIds } from '@/lib/reporting/cookie';
import { REPORTED_COOKIE, addReportedId, isListingId } from '@/lib/reporting/reported';
import { validateReport } from '@/lib/reporting/validate';
import { SAFETY_CONSENT_COOKIE, SAFETY_CONSENT_MAX_AGE, SAFETY_CONSENT_VERSION } from '@/lib/safety/consent';

const secure = process.env.VERCEL_ENV !== undefined;

/** Server-side check: the checkbox value must be posted, so the button state alone is never the gate. */
export async function acceptSafetyConsent(formData: FormData): Promise<void> {
  if (formData.get('agree') !== 'on') return;
  (await cookies()).set(SAFETY_CONSENT_COOKIE, SAFETY_CONSENT_VERSION, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: SAFETY_CONSENT_MAX_AGE,
  });
  const viewport = formData.get('viewport');
  logEvent('consent_accepted', isViewport(viewport) ? viewport : undefined);
}

/** Demo only: nothing about the visitor is stored. */
export async function demoSignIn(): Promise<void> {
  (await cookies()).set(DEMO_SESSION_COOKIE, DEMO_SESSION_VALUE, { httpOnly: true, sameSite: 'lax', secure, path: '/' });
  logEvent('signup_completed');
  redirect('/#listing');
}

export async function demoSignOut(): Promise<void> {
  (await cookies()).delete(DEMO_SESSION_COOKIE);
  redirect('/');
}

/**
 * Preview-only report intake: validates, then hides the listing for this browser (cookie). Nothing is stored on a server
 * and nobody reviews it; the pages say so. Idempotent per listing.
 */
export async function submitReport(formData: FormData): Promise<void> {
  const id = formData.get('listing_id');
  if (!isListingId(id)) redirect('/');
  const result = validateReport(formData);
  if (!result.ok) {
    // A filled honeypot gets a normal-looking confirmation and no effect, so bots learn nothing.
    redirect(`/listing/${id}/laporkan?${result.code === 'spam' ? 'status=ok' : `error=${result.code}`}`);
  }
  const reported = await getReportedIds();
  const visible = listPreviewCards(new Date(), reported);
  // Only a listing this visitor is allowed to see can be reported, so the form cannot probe locked listings.
  if (!reported.includes(id) && !canViewListing(visible, id, await isDemoSignedIn())) redirect('/');
  const jar = await cookies();
  jar.set(REPORTED_COOKIE, addReportedId(jar.get(REPORTED_COOKIE)?.value, id), { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: 60 * 60 * 24 * 30 });
  redirect(`/listing/${id}/laporkan?status=ok`);
}
