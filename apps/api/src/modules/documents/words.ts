/** Amounts in words, as Ugandan receipts carry them: "Uganda Shillings Four Hundred Fifty Thousand Only". */
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const SCALES: [bigint, string][] = [[1_000_000_000_000n, 'Trillion'], [1_000_000_000n, 'Billion'], [1_000_000n, 'Million'], [1_000n, 'Thousand']];

function under1000(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ' and' : ''}`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)]! + (n % 10 ? `-${ONES[n % 10]}` : ''));
  } else if (n > 0) parts.push(ONES[n]!);
  return parts.join(' ');
}

export function integerWords(v: bigint): string {
  if (v === 0n) return 'Zero';
  const out: string[] = [];
  let n = v < 0n ? -v : v;
  for (const [size, name] of SCALES) {
    if (n >= size) {
      out.push(`${integerWords(n / size)} ${name}`);
      n %= size;
    }
  }
  // British usage, as on Ugandan documents: "One Thousand and Five".
  if (n > 0n) out.push(`${out.length && n < 100n ? 'and ' : ''}${under1000(Number(n))}`);
  return out.join(' ');
}

export function amountInWords(minor: bigint, currency: string): string {
  const abs = minor < 0n ? -minor : minor;
  if (currency === 'USD') {
    const dollars = abs / 100n;
    const cents = abs % 100n;
    return `US Dollars ${integerWords(dollars)}${cents ? ` and ${cents.toString().padStart(2, '0')}/100` : ''} Only`;
  }
  return `Uganda Shillings ${integerWords(abs)} Only`;
}
