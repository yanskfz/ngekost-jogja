'use client';

import { useEffect, useRef, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { acceptSafetyConsent } from '@/app/actions';
import { trackEvent } from '@/lib/analytics/client';
import { viewportBucket } from '@/lib/analytics/events';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/**
 * Blocking anti-scam consent. There is no close control, no backdrop handler, and Escape is swallowed.
 * The server action re-checks the checkbox value, and the layout renders this component on every request
 * until the consent cookie exists, so refresh and direct URLs cannot bypass it.
 */
export function ConsentModal() {
  const [agreed, setAgreed] = useState(false);
  const [viewport, setViewport] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const checkboxRef = useRef<HTMLInputElement>(null);
  const submitted = useRef(false);

  useEffect(() => {
    setViewport(viewportBucket(window.innerWidth));
    trackEvent('consent_shown');
    const onPageHide = () => {
      if (!submitted.current) trackEvent('consent_abandoned');
    };
    window.addEventListener('pagehide', onPageHide);
    checkboxRef.current?.focus();
    const dialog = dialogRef.current;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key !== 'Tab' || !dialog) return;
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!dialog.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const onFocusIn = (e: FocusEvent) => {
      if (dialog && e.target instanceof Node && !dialog.contains(e.target)) checkboxRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusin', onFocusIn);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusin', onFocusIn);
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="modal-backdrop" data-testid="consent-backdrop">
      <div ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="consent-title" aria-describedby="consent-desc">
        <div className="modal__top">
          <TriangleAlert className="warning__icon" size={44} fill="currentColor" stroke="#fff" aria-hidden="true" />
          <img className="modal__art" src="/images/warning-girl.webp" alt="" width={331} height={370} decoding="async" />
        </div>
        <h2 id="consent-title">Jangan transfer uang sebelum lihat langsung!</h2>
        <div id="consent-desc">
          <ol className="modal__list">
            <li>Survei langsung ke lokasi.</li>
            <li>Jangan transfer sebelum melihat langsung.</li>
            <li>Hubungi hanya lewat kontak yang tertera di Ngekost Jogja.</li>
          </ol>
        </div>
        <details className="modal__more">
          <summary>Baca panduan lengkap</summary>
          <ul>
            <li>Ngekost Jogja tidak meminta atau memproses pembayaran dan tidak menjamin transaksi. Listing yang ditinjau admin bukan jaminan keamanan.</li>
            <li>Jangan membayar deposit, biaya booking, atau biaya admin sebelum melihat kamar atau rumah langsung.</li>
            <li>Verifikasi pemilik atau agen secara mandiri dan pastikan nomor WhatsApp sama dengan yang tertera di listing.</li>
            <li>Curiga foto dipakai ulang, harga jauh di bawah pasaran, atau diminta DP sebelum survei? Laporkan listing lewat tombol Laporkan di halaman detail.</li>
          </ul>
        </details>
        <form action={acceptSafetyConsent} onSubmit={() => { submitted.current = true; }}>
          <input type="hidden" name="viewport" value={viewport} />
          <label className="modal__check">
            <input ref={checkboxRef} type="checkbox" name="agree" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span>Saya paham dan akan verifikasi langsung sebelum membayar.</span>
          </label>
          <noscript>
            <p className="modal__nojs">Aktifkan JavaScript di browser untuk melanjutkan: kotak persetujuan ini membutuhkannya.</p>
          </noscript>
          <button type="submit" className="button modal__submit" disabled={!agreed}>
            Saya paham, lanjut melihat listing
          </button>
        </form>
      </div>
    </div>
  );
}
