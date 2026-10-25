import { redirect } from 'next/navigation';
import { demoSignIn } from '@/app/actions';
import { TrackMount } from '@/components/trust/TrackMount';
import { Header } from '@/components/site/Header';
import { isDemoSignedIn } from '@/lib/auth/demo-session';

import { consentMissing } from '@/lib/safety/consent';

export const dynamic = 'force-dynamic';

export default async function SignInPage() {
  if (await consentMissing()) return null;
  if (await isDemoSignedIn()) redirect('/#listing');
  return (
    <>
      <Header />
      <main className="detail">
        <TrackMount event="signup_started" />
        <h1>Masuk atau daftar</h1>
        <p className="notice" role="note">
          <strong>Mode demo.</strong> Preview ini belum punya akun sungguhan. Tombol di bawah hanya membuka semua listing contoh di browser ini;
          tidak ada email, nomor, atau data pembayaran yang diminta atau disimpan.
        </p>
        <p>Dengan masuk, kamu bisa melihat semua 5 listing contoh, bukan hanya 3.</p>
        <form action={demoSignIn}>
          <button type="submit" className="button button--wa">
            Masuk / Daftar (demo)
          </button>
        </form>
      </main>
    </>
  );
}
