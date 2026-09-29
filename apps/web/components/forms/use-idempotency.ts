'use client';
import { useEffect, useState } from 'react';

/** One key per form instance, created after mount (static pages are shared by every visitor). */
export function useIdempotencyKey() {
  const [key, setKey] = useState('');
  useEffect(() => setKey(crypto.randomUUID()), []);
  return key;
}
