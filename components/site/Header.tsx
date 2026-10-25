import Link from 'next/link';
import { Menu } from 'lucide-react';
import { demoSignOut } from '@/app/actions';
import { BrandLink } from '@/components/site/BrandBar';
import { isDemoSignedIn } from '@/lib/auth/demo-session';

export async function Header() {
  const signedIn = await isDemoSignedIn();
  return (
    <header className="header">
      <BrandLink />
      <details className="menu">
        <summary aria-label="Menu">
          <Menu size={30} aria-hidden="true" />
        </summary>
        <nav aria-label="Menu utama">
          <Link href="/">Beranda</Link>
          <Link href="/?type=kost#listing">Cari Kost</Link>
          <Link href="/?type=kontrakan#listing">Cari Kontrakan</Link>
          <Link href="/#keamanan">Tips keamanan</Link>
          {signedIn ? (
            <form action={demoSignOut}>
              <button type="submit">Keluar (demo)</button>
            </form>
          ) : (
            <Link href="/masuk">Masuk / Daftar (demo)</Link>
          )}
        </nav>
      </details>
    </header>
  );
}
