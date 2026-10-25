import { BadgeCheck, CircleDashed } from 'lucide-react';
import { TRUST_DISCLAIMER, type TrustItem } from '@/lib/data/trust';

/** Compact evidence row for cards: only checks that actually passed, never a stronger claim than the record supports. */
export function TrustRow({ items }: { items: TrustItem[] }) {
  const ok = items.filter((i) => i.ok);
  if (ok.length === 0) return <p className="trust-row trust-row--none">Belum ada bukti yang tercatat</p>;
  return (
    <ul className="trust-row" aria-label="Bukti yang sudah dicek">
      {ok.map((i) => (
        <li key={i.key}>
          <BadgeCheck size={13} aria-hidden="true" /> {i.short}
        </li>
      ))}
    </ul>
  );
}

/** Full list for the detail page: shows what has and has not been checked, plus the non-guarantee disclaimer. */
export function TrustPanel({ items }: { items: TrustItem[] }) {
  return (
    <section className="trust-panel" aria-labelledby="trust-panel-title">
      <h2 id="trust-panel-title">Bukti yang sudah dicek</h2>
      <ul>
        {items.map((i) => (
          <li key={i.key} className={i.ok ? 'is-ok' : 'is-missing'}>
            {i.ok ? <BadgeCheck size={18} aria-hidden="true" /> : <CircleDashed size={18} aria-hidden="true" />}
            <span>
              {i.label}
              <span className="sr-only">{i.ok ? ': sudah' : ': belum'}</span>
              {i.ok ? null : <em> (belum)</em>}
            </span>
          </li>
        ))}
      </ul>
      <p className="trust-panel__note">{TRUST_DISCLAIMER}</p>
    </section>
  );
}
