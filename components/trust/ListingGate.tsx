import Link from 'next/link';
import { Lock } from 'lucide-react';

/** Locked teaser for listings withheld from anonymous visitors. It receives only a count, never listing data. */
export function ListingGate({ lockedCount }: { lockedCount: number }) {
  return (
    <section className="gate" data-testid="listing-gate" aria-labelledby="gate-title">
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
        <h3 id="gate-title">{lockedCount} listing lainnya terkunci</h3>
        <p>Daftar atau masuk untuk melihat semua listing. Mode demo: tidak ada akun yang dibuat dan tidak ada pembayaran.</p>
        <Link href="/masuk" className="button">
          Masuk / Daftar (demo)
        </Link>
      </div>
    </section>
  );
}
