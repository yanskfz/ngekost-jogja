import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ngekost Jogja — Cari kost & kontrakan di Sleman dan Kota Jogja',
  description: 'Marketplace kost dan kontrakan Sleman dan Kota Jogja. Preview dengan data contoh.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#fbf8f1',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
