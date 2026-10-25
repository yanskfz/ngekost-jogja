import { TriangleAlert } from 'lucide-react';

export function AntiScamWarning({ id }: { id?: string }) {
  const titleId = `${id ?? 'warning'}-title`;
  return (
    <section id={id} className="warning" aria-labelledby={titleId}>
      <TriangleAlert className="warning__icon" size={44} fill="currentColor" stroke="#fff" aria-hidden="true" />
      <div className="warning__text">
        <h2 id={titleId}>Jangan transfer uang sebelum lihat langsung!</h2>
        <p>
          Selalu cek kondisi lokasi, cocokkan dengan informasi di iklan, dan pastikan menghubungi pemilik melalui WhatsApp
          yang tercantum di Ngekost Jogja.
        </p>
        <p className="warning__fine">Ngekost Jogja tidak meminta atau memproses pembayaran dan tidak menjamin transaksi.</p>
      </div>
      <img className="warning__art" src="/images/warning-girl.webp" alt="" width={331} height={370} loading="lazy" decoding="async" />
    </section>
  );
}
