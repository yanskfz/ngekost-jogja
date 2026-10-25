import { Camera } from 'lucide-react';
import { PHOTO_RULES, PHOTO_SLOTS } from '@/lib/validation/photos';

/** Tells visitors what the three photos should show, and how to spot reused photos. Shown on the detail page. */
export function PhotoGuidance() {
  return (
    <details className="guidance">
      <summary>
        <Camera size={18} aria-hidden="true" /> Cek foto sebelum survei
      </summary>
      <ol>
        {PHOTO_SLOTS.map((s) => (
          <li key={s.position}>
            <strong>{s.title}.</strong> {s.hint}
          </li>
        ))}
      </ol>
      <ul>
        {PHOTO_RULES.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p>Curiga foto dipakai ulang atau tidak cocok dengan lokasi? Laporkan listing ini.</p>
    </details>
  );
}
