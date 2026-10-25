'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';

const KEY = 'ngekost:favorites';

function read(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** Per-browser favorite toggle. Stored only in this browser's localStorage; nothing is sent anywhere. */
export function FavoriteButton({ id, title }: { id: string; title: string }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => setSaved(read().includes(id)), [id]);

  function toggle() {
    const next = !saved;
    setSaved(next);
    try {
      const current = read().filter((v) => v !== id);
      localStorage.setItem(KEY, JSON.stringify(next ? [...current, id] : current));
    } catch {
      /* storage unavailable: keep the in-memory state only */
    }
  }

  return (
    <button type="button" className="fav" aria-pressed={saved} aria-label={`Simpan ${title}`} onClick={toggle}>
      <span className="fav__circle">
        <Heart size={20} aria-hidden="true" fill={saved ? 'currentColor' : 'none'} />
      </span>
    </button>
  );
}
