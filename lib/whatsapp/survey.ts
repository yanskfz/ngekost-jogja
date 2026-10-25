/** "Jadwalkan survei" message. It proposes a visit and states no payment is made beforehand; it never mentions amounts. */
export function buildSurveyMessage(input: { contactName: string; title: string; neighborhood: string }): string {
  const { contactName, title, neighborhood } = input;
  return [
    `Halo ${contactName}, saya melihat iklan "${title}" (${neighborhood}) di Ngekost Jogja.`,
    'Saya ingin menjadwalkan survei langsung ke lokasi. Hari dan jam apa yang bisa?',
    'Saya belum akan membayar atau mentransfer apa pun sebelum survei.',
  ].join('\n');
}

export function whatsappLink(number: string, text?: string): string {
  const digits = number.replace(/\D/g, '');
  return text ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : `https://wa.me/${digits}`;
}
