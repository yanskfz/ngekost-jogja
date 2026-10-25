import { CalendarClock, Flag, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { AntiScamWarning } from '@/components/trust/AntiScamWarning';
import { buildSurveyMessage, whatsappLink } from '@/lib/whatsapp/survey';

/**
 * Contact block. The anti-scam warning always comes first in the DOM, then the survey and WhatsApp actions, which exist
 * only when the submitter gave contact consent.
 */
export function ContactActions(props: { listingId: string; title: string; neighborhood: string; contactName: string; whatsapp: string | null }) {
  const { listingId, title, neighborhood, contactName, whatsapp } = props;
  const survey = buildSurveyMessage({ contactName, title, neighborhood });
  return (
    <>
      <AntiScamWarning id="detail-warning" />
      {whatsapp ? (
        <div className="contact">
          <a className="button button--wa" data-testid="survey-cta" href={whatsappLink(whatsapp, survey)} rel="noopener noreferrer" target="_blank">
            <CalendarClock size={20} aria-hidden="true" /> Jadwalkan survei
          </a>
          <details className="contact__preview">
            <summary>Lihat pesan survei</summary>
            <pre data-testid="survey-text">{survey}</pre>
          </details>
          <a className="button button--ghost" data-testid="wa-cta" href={whatsappLink(whatsapp)} rel="noopener noreferrer" target="_blank">
            <MessageCircle size={20} aria-hidden="true" /> Hubungi via WhatsApp
          </a>
        </div>
      ) : (
        <p className="notice">Pemasang belum mengizinkan kontak lewat WhatsApp untuk listing ini.</p>
      )}
      <p className="report-link">
        <Link href={`/listing/${listingId}/laporkan`}>
          <Flag size={16} aria-hidden="true" /> Laporkan listing ini
        </Link>
      </p>
    </>
  );
}
