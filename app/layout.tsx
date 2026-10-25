import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { BrandLink } from '@/components/site/BrandBar';
import { ConsentModal } from '@/components/trust/ConsentModal';
import { hasSafetyConsent } from '@/lib/safety/consent';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ngekost Jogja — Cari kost & kontrakan di Sleman dan Kota Jogja',
  description: 'Marketplace kost dan kontrakan Sleman dan Kota Jogja. Preview dengan data contoh.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#faf9f6',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Until consent exists, no page content is rendered at all: only the brand and the blocking modal.
  const consented = await hasSafetyConsent();
  return (
    <html lang="id">
      <body>
        {consented ? (
          children
        ) : (
          <>
            <div className="header" aria-hidden="true" {...{ inert: true }}>
              <BrandLink />
            </div>
            <ConsentModal />
          </>
        )}
      </body>
    </html>
  );
}
