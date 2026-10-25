import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { submitReport } from '@/app/actions';
import { Header } from '@/components/site/Header';
import { isDemoSignedIn } from '@/lib/auth/demo-session';
import { canViewListing } from '@/lib/data/access';
import { listPreviewCards } from '@/lib/data/preview';
import { getReportedIds } from '@/lib/reporting/cookie';
import { isListingId } from '@/lib/reporting/reported';
import { MAX_CONTACT, MAX_DETAIL, REPORT_ERROR_TEXT, REPORT_REASON_LABEL } from '@/lib/reporting/validate';
import { consentMissing } from '@/lib/safety/consent';
import { REPORT_REASONS } from '@/lib/data/types';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ReportPage({ params, searchParams }: Props) {
  if (await consentMissing()) return null;
  const { id } = await params;
  const sp = await searchParams;
  if (!isListingId(id)) notFound();

  if (sp.status === 'ok') {
    // The confirmation reads no listing data, so it is safe even after the listing disappeared from results.
    return (
      <>
        <Header />
        <main className="detail">
          <h1>Laporan diterima</h1>
          <p className="notice" role="status" data-testid="report-confirmation">
            <CheckCircle2 size={18} aria-hidden="true" /> Terima kasih. Listing ini sekarang disembunyikan dari hasil pencarianmu.
          </p>
          <p>
            <strong>Mode demo:</strong> laporan ini tidak dikirim atau disimpan di server dan belum ada admin yang meninjaunya. Di produk sebenarnya, laporan akan langsung menyembunyikan listing
            untuk semua orang sambil admin menyelidiki.
          </p>
          <Link href="/#listing" className="button">
            Kembali ke daftar
          </Link>
        </main>
      </>
    );
  }

  const reported = await getReportedIds();
  const cards = listPreviewCards(new Date(), reported);
  const card = cards.find((c) => c.id === id);
  if (!card) notFound();
  if (!canViewListing(cards, id, await isDemoSignedIn())) notFound();
  const error = typeof sp.error === 'string' && sp.error in REPORT_ERROR_TEXT ? REPORT_ERROR_TEXT[sp.error as keyof typeof REPORT_ERROR_TEXT] : null;

  return (
    <>
      <Header />
      <main className="detail">
        <Link href={`/listing/${id}`} className="back">
          <ArrowLeft size={18} aria-hidden="true" /> Kembali
        </Link>
        <h1>Laporkan listing</h1>
        <p>
          <strong>{card.title}</strong>
        </p>
        <p className="notice" role="note">
          <strong>Mode demo.</strong> Laporan tidak dikirim ke siapa pun dan tidak disimpan di server. Setelah dikirim, listing hanya disembunyikan dari browser ini.
        </p>
        {error ? (
          <p className="form-error" role="alert" data-testid="report-error">
            {error}
          </p>
        ) : null}
        <form action={submitReport} className="report-form">
          <input type="hidden" name="listing_id" value={id} />
          <fieldset>
            <legend>Alasan laporan</legend>
            {REPORT_REASONS.map((r) => (
              <label key={r} className="check check--block">
                <input type="radio" name="reason" value={r} required /> {REPORT_REASON_LABEL[r]}
              </label>
            ))}
          </fieldset>
          <div className="field">
            <label htmlFor="r-detail">Keterangan (opsional)</label>
            <textarea id="r-detail" name="detail" rows={4} maxLength={MAX_DETAIL} placeholder="Ceritakan apa yang tidak cocok, tanpa memasukkan data pembayaran." />
            <small>Maksimal {MAX_DETAIL} karakter. Jangan tulis nomor rekening atau data kartu.</small>
          </div>
          <div className="field">
            <label htmlFor="r-contact">Kontak kamu (opsional)</label>
            <input id="r-contact" name="contact" type="text" maxLength={MAX_CONTACT} autoComplete="off" />
            <small>Diisi hanya jika admin boleh menghubungimu.</small>
          </div>
          <div className="hp" aria-hidden="true">
            <label>
              Jangan diisi
              <input name="website" type="text" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <button type="submit" className="button">
            Kirim laporan
          </button>
        </form>
      </main>
    </>
  );
}
