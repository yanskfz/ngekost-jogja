import Link from 'next/link';
import { Lock } from 'lucide-react';
import { TrackMount } from '@/components/trust/TrackMount';

/** Locked teaser for listings withheld from anonymous visitors. It receives only a count, never listing data. */
export function ListingGate({ lockedCount, headingLevel = 3 }: { lockedCount: number; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section className="gate" data-testid="listing-gate" aria-labelledby="gate-title">
      <TrackMount event="gate_shown" />
      <ul className="gate__rows" aria-hidden="true">
        {Array.from({ length: lockedCount }, (_, i) => (
          <li key={i} className="gate__row" data-testid="locked-teaser">
            <span className="gate__photo" />
            <span className="gate__lines">
              <span />
              <span />
              <span />
            </span>
            <Lock size={20} />
          </li>
        ))}
      </ul>
      <div className="gate__cta">
        <Lock size={22} aria-hidden="true" />
        <Heading id="gate-title">{lockedCount} listing lainnya terkunci</Heading>
        <p>Daftar atau masuk untuk melihat semua listing. Mode demo: tidak ada akun yang dibuat dan tidak ada pembayaran.</p>
        <Link href="/masuk" className="button">
          Masuk / Daftar (demo)
        </Link>
      </div>
    </section>
  );
}
