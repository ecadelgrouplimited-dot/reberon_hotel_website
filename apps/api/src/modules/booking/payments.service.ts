import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../common/redis.service.js';
import { badRequest } from '../../common/errors.js';
import { env } from '../../config.js';
import { IntegrationsService, pesapalBase, type ResolvedIntegration } from '../integrations/integrations.service.js';

export interface OrderRequest {
  merchantReference: string;
  amountMinor: bigint;
  currency: 'UGX' | 'USD';
  description: string;
  callbackUrl: string;
  guest: { email?: string | null; phone?: string | null; firstName: string; lastName: string };
}

export interface ProviderStatus {
  outcome: 'SUCCEEDED' | 'FAILED' | 'PENDING' | 'REVERSED';
  providerStatus: string;
  method: 'MOBILE_MONEY' | 'CARD' | 'CASH' | 'BANK' | 'UNKNOWN';
  confirmationCode?: string;
  amountMinor?: bigint;
  currency?: string;
  merchantReference?: string;
}

/**
 * Talks to payment providers only; what a payment *means* for a booking lives
 * in BookingService. Keys never leave the API.
 */
@Injectable()
export class PaymentsService {
  private readonly log = new Logger('Payments');
  private token: { value: string; expires: number; keyId: string } | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly integrations: IntegrationsService,
  ) {}

  /** Pesapal from the vault (or environment); the simulated provider only outside production. */
  async provider(): Promise<'PESAPAL' | 'TEST'> {
    if (await this.integrations.get('PESAPAL')) return 'PESAPAL';
    if (env.NODE_ENV === 'production') throw badRequest('Online payment is not set up yet. Please book on WhatsApp.');
    return 'TEST';
  }

  private async cfg(): Promise<ResolvedIntegration> {
    const c = await this.integrations.get('PESAPAL');
    if (!c) throw badRequest('Online payment is not set up yet.');
    return c;
  }

  /** Amounts go to Pesapal in major units. */
  private major(amountMinor: bigint, currency: string) {
    return currency === 'USD' ? Number(amountMinor) / 100 : Number(amountMinor);
  }

  async createOrder(o: OrderRequest): Promise<{ redirectUrl: string; trackingId: string | null; provider: 'PESAPAL' | 'TEST' }> {
    if ((await this.provider()) === 'TEST') {
      return { provider: 'TEST', trackingId: null, redirectUrl: `${env.WEB_URL}/book/test-payment?ref=${encodeURIComponent(o.merchantReference)}` };
    }
    const ipnId = await this.ipnId();
    const res = await this.call<{ order_tracking_id: string; redirect_url: string; error?: { message?: string } | null }>('POST', '/api/Transactions/SubmitOrderRequest', {
      id: o.merchantReference,
      currency: o.currency,
      amount: this.major(o.amountMinor, o.currency),
      description: o.description.slice(0, 100),
      callback_url: o.callbackUrl,
      notification_id: ipnId,
      billing_address: { email_address: o.guest.email ?? undefined, phone_number: o.guest.phone ?? undefined, country_code: 'UG', first_name: o.guest.firstName, last_name: o.guest.lastName },
    });
    if (!res.redirect_url) throw badRequest(`Payment provider refused the order: ${res.error?.message ?? 'unknown error'}`);
    return { provider: 'PESAPAL', trackingId: res.order_tracking_id, redirectUrl: res.redirect_url };
  }

  /** Ask Pesapal what really happened — never trust the notification body alone. */
  async pesapalStatus(trackingId: string): Promise<ProviderStatus> {
    const r = await this.call<{ payment_status_description?: string; status_code?: number; payment_method?: string; confirmation_code?: string; amount?: number; currency?: string; merchant_reference?: string }>(
      'GET',
      `/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(trackingId)}`,
    );
    const code = r.status_code;
    const outcome = code === 1 ? 'SUCCEEDED' : code === 2 ? 'FAILED' : code === 3 ? 'REVERSED' : 'PENDING';
    const pm = (r.payment_method ?? '').toLowerCase();
    return {
      outcome,
      providerStatus: r.payment_status_description ?? String(code),
      method: /mpesa|mobile|momo|airtel|mtn/.test(pm) ? 'MOBILE_MONEY' : /visa|master|card/.test(pm) ? 'CARD' : 'UNKNOWN',
      confirmationCode: r.confirmation_code,
      amountMinor: r.amount !== undefined ? BigInt(Math.round(r.currency === 'USD' ? r.amount * 100 : r.amount)) : undefined,
      currency: r.currency,
      merchantReference: r.merchant_reference,
    };
  }

  private async ipnId(): Promise<string> {
    const c = await this.cfg();
    const url = `${env.API_URL}/v1/webhooks/pesapal`;
    const key = `pesapal:${c.mode}:${c.values.consumerKey?.slice(-6)}:ipn:${url}`;
    const cached = await this.redis.client.get(key);
    if (cached) return cached;
    const r = await this.call<{ ipn_id: string }>('POST', '/api/URLSetup/RegisterIPN', { url, ipn_notification_type: 'POST' });
    await this.redis.client.set(key, r.ipn_id);
    this.log.log(`registered Pesapal IPN ${r.ipn_id} for ${url}`);
    return r.ipn_id;
  }

  private async bearer() {
    const c = await this.cfg();
    const keyId = `${c.mode}:${c.values.consumerKey}`;
    if (this.token && this.token.keyId === keyId && this.token.expires > Date.now() + 30_000) return this.token.value;
    const res = await fetch(`${pesapalBase(c.mode)}/api/Auth/RequestToken`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ consumer_key: c.values.consumerKey, consumer_secret: c.values.consumerSecret }),
      signal: AbortSignal.timeout(15_000),
    });
    const j = (await res.json()) as { token?: string; expiryDate?: string; error?: { message?: string } };
    if (!j.token) throw new Error(`Pesapal auth failed: ${j.error?.message ?? res.status}`);
    this.token = { value: j.token, keyId, expires: j.expiryDate ? Date.parse(j.expiryDate) : Date.now() + 4 * 60_000 };
    return j.token;
  }

  private async call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${pesapalBase((await this.cfg()).mode)}${path}`, {
      method,
      headers: { authorization: `Bearer ${await this.bearer()}`, 'content-type': 'application/json', accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`Pesapal ${path} → ${res.status}`);
    return res.json() as Promise<T>;
  }
}
