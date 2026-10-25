import { cookies } from 'next/headers';
import { REPORTED_COOKIE, parseReportedIds } from '@/lib/reporting/reported';

export async function getReportedIds(): Promise<string[]> {
  return parseReportedIds((await cookies()).get(REPORTED_COOKIE)?.value);
}
