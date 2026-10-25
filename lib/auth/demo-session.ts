import { cookies } from 'next/headers';

// Preview/demo sign-in: a server-set HttpOnly cookie, NOT real authentication. No account, email, or password is
// stored or verified. Real enforcement of the anonymous listing limit needs hosted auth (see docs/PUBLIC_LAUNCH_DATABASE.md).
export const DEMO_SESSION_COOKIE = 'nk_demo_session';
export const DEMO_SESSION_VALUE = 'demo-v1';

export async function isDemoSignedIn(): Promise<boolean> {
  return (await cookies()).get(DEMO_SESSION_COOKIE)?.value === DEMO_SESSION_VALUE;
}
