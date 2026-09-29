'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SiteDTO, RoomTypeCardDTO } from '@reberon/contracts';

type Currency = 'UGX' | 'USD';

export interface EnquiryPrefill {
  intent?: 'STAY' | 'EVENT' | 'GROUP' | 'GENERAL';
  roomTypeSlug?: string;
  roomName?: string;
}

interface Ctx {
  site: SiteDTO;
  rooms: RoomTypeCardDTO[];
  currency: Currency;
  setCurrency: (c: Currency) => void;
  enquiry: EnquiryPrefill | null;
  openEnquiry: (p?: EnquiryPrefill) => void;
  closeEnquiry: () => void;
}

const SiteCtx = createContext<Ctx | null>(null);

export function SiteProvider({ site, rooms, children }: { site: SiteDTO; rooms: RoomTypeCardDTO[]; children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>((site.defaultCurrency as Currency) ?? 'UGX');
  const [enquiry, setEnquiry] = useState<EnquiryPrefill | null>(null);

  useEffect(() => {
    try {
      const c = localStorage.getItem('rb-currency');
      if (c === 'UGX' || c === 'USD') setCurrencyState(c);
    } catch {}
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    try {
      localStorage.setItem('rb-currency', c);
    } catch {}
  }, []);

  const value = useMemo<Ctx>(
    () => ({ site, rooms, currency, setCurrency, enquiry, openEnquiry: (p = {}) => setEnquiry(p), closeEnquiry: () => setEnquiry(null) }),
    [site, rooms, currency, setCurrency, enquiry],
  );
  return <SiteCtx.Provider value={value}>{children}</SiteCtx.Provider>;
}

export function useSite() {
  const v = useContext(SiteCtx);
  if (!v) throw new Error('useSite outside SiteProvider');
  return v;
}
