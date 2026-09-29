/** Crockford-style alphabet without look-alikes (0/O, 1/I/L). Readable on a phone. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function randomCode(length = 4): string {
  // Web Crypto works in Node and browsers; rejection sampling keeps it unbiased.
  const out: string[] = [];
  const buf = new Uint8Array(1);
  while (out.length < length) {
    globalThis.crypto.getRandomValues(buf);
    const v = buf[0]!;
    if (v < 256 - (256 % ALPHABET.length)) out.push(ALPHABET[v % ALPHABET.length]!);
  }
  return out.join('');
}

/** e.g. referenceCode('EQ') -> "EQ-7K3Q" */
export function referenceCode(prefix: string, length = 4): string {
  return `${prefix}-${randomCode(length)}`;
}
