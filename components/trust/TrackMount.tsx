'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics/client';
import type { EventName } from '@/lib/analytics/events';

/** Fires one anonymous funnel event when it appears on screen. */
export function TrackMount({ event }: { event: EventName }) {
  useEffect(() => trackEvent(event), [event]);
  return null;
}
