import { TriangleAlert } from 'lucide-react';

export function AntiScamWarning({ id }: { id?: string }) {
  return (
    <section id={id} className="warning" aria-labelledby={`${id ?? 'warning'}-title`}>
      <TriangleAlert className="warning__icon" size={40} aria-hidden="true" />
      <div>
        <h2 id={`${id ?? 'warning'}-title`}>Jangan transfer uang sebelum lihat langsung!</h2>
        <p>
          Selalu cek kondisi lokasi, cocokkan dengan informasi di iklan, dan verifikasi sendiri sebelum membayar. Ngekost
          Jogja tidak meminta atau memproses pembayaran, dan tidak menjamin transaksi.
        </p>
      </div>
    </section>
  );
}
