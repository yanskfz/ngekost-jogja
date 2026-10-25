'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DEMO_SESSION_COOKIE, DEMO_SESSION_VALUE } from '@/lib/auth/demo-session';
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
}

/** Demo only: nothing about the visitor is stored. */
export async function demoSignIn(): Promise<void> {
  (await cookies()).set(DEMO_SESSION_COOKIE, DEMO_SESSION_VALUE, { httpOnly: true, sameSite: 'lax', secure, path: '/' });
  redirect('/#listing');
}

export async function demoSignOut(): Promise<void> {
  (await cookies()).delete(DEMO_SESSION_COOKIE);
  redirect('/');
}
