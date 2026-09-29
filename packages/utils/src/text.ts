export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Normalise a phone number to E.164. Numbers without a country code are
 * treated as Ugandan (+256). Returns null when it cannot be a real number.
 */
export function normalizePhone(raw: string, defaultCountryCode = '256'): string | null {
  const trimmed = raw.trim();
  let digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return null;
  if (trimmed.startsWith('+')) {
    // already international
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = defaultCountryCode + digits.slice(1);
  } else if (digits.length === 9) {
    digits = defaultCountryCode + digits;
  }
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

export function whatsappLink(phoneE164: string, message: string): string {
  return `https://wa.me/${phoneE164.replace(/[^\d]/g, '')}?text=${encodeURIComponent(message)}`;
}
