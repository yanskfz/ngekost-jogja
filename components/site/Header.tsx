import Link from 'next/link';
import { Menu } from 'lucide-react';

export function Header() {
  return (
    <header className="header">
      <Link href="/" className="brand">
        <span className="brand__name">
          Ngekost <span>Jogja</span>
        </span>
        <span className="brand__tag">Cari kost &amp; kontrakan jadi lebih aman</span>
      </Link>
      <details className="menu">
        <summary aria-label="Menu">
          <Menu size={28} aria-hidden="true" />
        </summary>
        <nav aria-label="Menu utama">
          <Link href="/">Beranda</Link>
          <Link href="/?type=kost#listing">Cari Kost</Link>
          <Link href="/?type=kontrakan#listing">Cari Kontrakan</Link>
          <Link href="/#keamanan">Tips keamanan</Link>
        </nav>
      </details>
    </header>
  );
}
