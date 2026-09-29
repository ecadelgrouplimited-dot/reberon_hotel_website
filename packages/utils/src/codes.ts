import { randomInt } from 'node:crypto';

/** Crockford-style alphabet without look-alikes (0/O, 1/I/L). Readable on a phone. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function randomCode(length = 4): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** e.g. referenceCode('EQ') -> "EQ-7K3Q" */
export function referenceCode(prefix: string, length = 4): string {
  return `${prefix}-${randomCode(length)}`;
}
