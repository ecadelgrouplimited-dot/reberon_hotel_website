'use server';
import { headers } from 'next/headers';
import { zEnquiryInput, zWaitlistInput } from '@reberon/contracts';
import type { ZodType } from 'zod';
import { ApiError, post } from '@/lib/api';

export interface FormState {
  status: 'idle' | 'success' | 'error';
  reference?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

function formToObject(fd: FormData) {
  const o: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith('$') || k === 'idempotencyKey') continue;
    if (typeof v === 'string') o[k] = v.trim();
  }
  o.consent = fd.get('consent') === 'on' || fd.get('consent') === 'true';
  if (fd.has('flexibleDates')) o.flexibleDates = fd.get('flexibleDates') === 'on';
  for (const n of ['adults', 'children']) if (o[n] === '') delete o[n];
  return o;
}

async function submit(path: string, schema: ZodType, fd: FormData): Promise<FormState> {
  const raw = formToObject(fd);
  const values = Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === 'string')) as Record<string, string>;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0] ?? 'form')] ??= i.message;
    return { status: 'error', message: 'A few details need attention.', fieldErrors, values };
  }
  const key = String(fd.get('idempotencyKey') ?? '') || undefined;
  const h = await headers();
  try {
    const res = await post<{ reference: string }>(path, parsed.data, {
      ...(key ? { 'idempotency-key': key } : {}),
      ...(fd.get('cf-turnstile-response') ? { 'x-turnstile-token': String(fd.get('cf-turnstile-response')) } : {}),
      'x-forwarded-for': h.get('x-forwarded-for') ?? '',
    });
    return { status: 'success', reference: res.reference };
  } catch (e) {
    if (e instanceof ApiError) {
      const fieldErrors = Object.fromEntries((e.body.errors ?? []).map((x) => [x.path.split('.')[0], x.message]));
      return {
        status: 'error',
        message: e.status === 429 ? 'Too many tries in a short time. Please wait a minute.' : (e.body.detail ?? 'Something went wrong. Please try again.'),
        fieldErrors,
        values,
      };
    }
    return { status: 'error', message: 'We could not reach the hotel just now. Your details are still here — try again, or message us on WhatsApp.', values };
  }
}

export async function submitEnquiry(_prev: FormState, fd: FormData) {
  return submit('/enquiries', zEnquiryInput, fd);
}

export async function submitWaitlist(_prev: FormState, fd: FormData) {
  return submit('/waitlist', zWaitlistInput, fd);
}
