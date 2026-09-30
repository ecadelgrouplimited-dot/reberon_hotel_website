import { z } from 'zod';
import type { CurrencyCode } from './booking.js';

/* Receipts, refund notes and invoices: numbered, immutable, printable. */

export const DOCUMENT_KINDS = ['RECEIPT', 'REFUND', 'INVOICE'] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];
export const DOCUMENT_LABEL: Record<DocumentKind, string> = { RECEIPT: 'Receipt', REFUND: 'Refund note', INVOICE: 'Invoice' };
export const DOCUMENT_PREFIX: Record<DocumentKind, string> = { RECEIPT: 'RCT', REFUND: 'RFD', INVOICE: 'INV' };

export interface DocumentLine {
  date: string;
  description: string;
  amountMinor: string;
}

/** Frozen at issue time — a reprint shows exactly what the guest was given. */
export interface DocumentData {
  title: string;
  hotel: { name: string; legalName: string | null; tin: string | null; address: string | null; phone: string | null; email: string | null; whatsapp: string | null };
  reservation: { code: string; arrival: string; departure: string; nights: number; room: string; guests: string } | null;
  payment: { method: string; reference: string | null; purpose: string; at: string } | null;
  lines: DocumentLine[];
  payments: DocumentLine[];
  totals: { chargesMinor: string; paidMinor: string; balanceMinor: string };
  vat: { ratePercent: number; includedMinor: string } | null;
  amountInWords: string;
  issuedBy: string | null;
  footer: string | null;
  note: string | null;
}

export interface IssuedDocumentDTO {
  id: string;
  kind: DocumentKind;
  number: string;
  currency: CurrencyCode;
  amountMinor: string;
  issuedTo: { name: string; phone: string | null; email: string | null };
  issuedAt: string;
  issuedBy: string | null;
  reservation: { id: string; code: string } | null;
  voided: { at: string; by: string | null; reason: string } | null;
  replacesNumber: string | null;
  printCount: number;
  sentAt: string | null;
  checkCode: string;
}

export interface DocumentRegisterDTO {
  data: IssuedDocumentDTO[];
  totals: Record<DocumentKind, { UGX: string; USD: string; count: number }>;
}

export const zVoidDocumentInput = z.object({
  reason: z.string().trim().min(3).max(300),
  /** Issue a corrected copy straight away (same amount, new number). */
  reissue: z.boolean().default(true),
  issuedToName: z.string().trim().min(2).max(120).optional(),
});

export const zSendDocumentInput = z.object({ channel: z.enum(['EMAIL', 'SMS', 'WHATSAPP']) });

export const zDocumentQuery = z.object({
  kind: z.enum(DOCUMENT_KINDS).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  q: z.string().max(60).optional(),
  reservationId: z.string().uuid().optional(),
});
