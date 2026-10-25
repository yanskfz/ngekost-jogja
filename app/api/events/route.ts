import { isEventName, isViewport, logEvent } from '@/lib/analytics/events';

export const dynamic = 'force-dynamic';

const MAX_BODY = 200;

export async function POST(request: Request): Promise<Response> {
  const raw = await request.text();
  if (raw.length > MAX_BODY) return new Response(null, { status: 413 });
  let name: unknown;
  let viewport: unknown;
  try {
    const body = JSON.parse(raw) as { event?: unknown; viewport?: unknown };
    name = body.event;
    viewport = body.viewport;
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!isEventName(name)) return new Response(null, { status: 400 });
  logEvent(name, isViewport(viewport) ? viewport : undefined);
  return new Response(null, { status: 204 });
}
