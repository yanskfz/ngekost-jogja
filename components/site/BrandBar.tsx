import Link from 'next/link';

export function BrandLink() {
  return (
    <Link href="/" className="brand">
      <img className="brand__logo" src="/images/logo.webp" alt="" width={98} height={68} />
      <span className="brand__text">
        <span className="brand__name">
          Ngekost <span>Jogja</span>
        </span>
        <span className="brand__tag">Cari kost &amp; kontrakan jadi lebih aman</span>
      </span>
    </Link>
  );
}
