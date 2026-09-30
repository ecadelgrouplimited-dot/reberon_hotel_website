import { HttpStatus, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Queue, Worker } from 'bullmq';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import type { MessageChannel, MessageTemplateDTO, OutboundMessageDTO } from '@reberon/contracts';
import { fillTemplate, t, templateDef, templateVars } from '@reberon/contracts';
import { formatMoney, hotelToday, normalizePhone, whatsappLink, type Currency } from '@reberon/utils';
import type { MessageTemplate, OutboundMessage, Prisma } from '@reberon/db';
import { PrismaService } from '../../common/prisma.service.js';
import { RedisService } from '../../common/redis.service.js';
import { AuditService } from '../../common/audit.service.js';
import type { AuthUser } from '../../common/auth.js';
import { AppError, badRequest, notFound } from '../../common/errors.js';
import { stayLink } from '../../common/stay-token.js';
import { env } from '../../config.js';
import { lt } from '../content/mappers.js';
import { GRAPH, IntegrationsService, africasTalkingBase, type ResolvedIntegration } from '../integrations/integrations.service.js';
import { NotificationsService } from './notifications.service.js';
import { ACTION_VAR, DEFAULT_TEMPLATES } from './template-defaults.js';

const QUEUE = 'messages';
type Vars = Record<string, string>;
type Recipient = { email?: string | null; phone?: string | null; whatsappOptIn?: boolean };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const long = (d: string) => new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`));
const money = (m: bigint, c: string) => formatMoney(m, c as Currency).replace(/\.00$/, '');
const digits = (phone: string) => phone.replace(/[^\d]/g, '');

/**
 * One way out for every guest message (M09, M10). Each message is written to
 * the outbox first, then delivered by a queue with retries. Channels that are
 * not connected yet are recorded as NOT_CONNECTED — with a wa.me link for
 * staff on WhatsApp — so switching a provider on later needs no code.
 */
@Injectable()
export class MessagingService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Messaging');
  private queue!: Queue;
  private worker!: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly integrations: IntegrationsService,
    private readonly notifications: NotificationsService,
  ) {}

  async onModuleInit() {
    const connection = this.redis.bullConnection();
    this.queue = new Queue(QUEUE, { connection, defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 15_000 }, removeOnComplete: 500, removeOnFail: 1000 } });
    this.worker = new Worker(QUEUE, async (job) => this.deliver(job.data.id as string, job.attemptsMade + 1 >= (job.opts.attempts ?? 1)), { connection, concurrency: 4 });
    this.worker.on('failed', (job, err) => this.log.warn(`message ${job?.data?.id} attempt failed: ${err.message}`));
    await this.ensureDefaults().catch((e) => this.log.error(`could not ensure default templates: ${(e as Error).message}`));
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  /** Create any template that does not exist yet. Never overwrites the owner's words. */
  async ensureDefaults() {
    const res = await this.prisma.messageTemplate.createMany({
      data: DEFAULT_TEMPLATES.map((d) => ({ key: d.key, channel: d.channel, subject: d.subject ?? null, heading: d.heading ?? null, body: d.body, actionLabel: d.actionLabel ?? null })),
      skipDuplicates: true,
    });
    if (res.count) this.log.log(`created ${res.count} default message templates`);
  }

  /* ───────── variables ───────── */

  private async settings() {
    const rows = await this.prisma.setting.findMany({ where: { key: { in: ['hotel.name', 'contact.whatsapp', 'contact.phones', 'hotel.checkInTime', 'hotel.checkOutTime'] } } });
    const s = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      hotelName: typeof s['hotel.name'] === 'string' ? s['hotel.name'] : t(lt(s['hotel.name'])) || 'Reberon Hotel',
      whatsapp: String(s['contact.whatsapp'] ?? (s['contact.phones'] as string[] | undefined)?.[0] ?? ''),
      checkInTime: String(s['hotel.checkInTime'] ?? '14:00'),
      checkOutTime: String(s['hotel.checkOutTime'] ?? '10:30'),
    };
  }

  /** Everything a reservation message may say, already formatted. */
  async reservationContext(reservationId: string) {
    const r = await this.prisma.reservation.findUniqueOrThrow({ where: { id: reservationId }, include: { contact: true, rooms: true, ratePlan: true, extras: true } });
    const [s, types] = await Promise.all([this.settings(), this.prisma.roomType.findMany({ where: { id: { in: r.rooms.map((x) => x.roomTypeId) } }, select: { id: true, name: true } })]);
    const nights = Math.round((r.departure.getTime() - r.arrival.getTime()) / 86_400_000);
    const room = r.rooms.map((x) => `${x.quantity > 1 ? `${x.quantity} × ` : ''}${t(lt(types.find((y) => y.id === x.roomTypeId)?.name))}`).join(', ');
    const vars: Vars = {
      ...s,
      guestFirstName: r.contact.name.trim().split(/\s+/)[0] ?? r.contact.name,
      code: r.code,
      arrival: long(iso(r.arrival)),
      departure: long(iso(r.departure)),
      nights: String(nights),
      room,
      total: money(r.totalMinor, r.currency),
      paid: money(r.paidMinor, r.currency),
      balance: money(r.totalMinor - r.paidMinor > 0n ? r.totalMinor - r.paidMinor : 0n, r.currency),
      stayLink: stayLink(r.code),
      feedbackLink: stayLink(r.code, '#feedback'),
      bookAgainLink: `${env.WEB_URL}/book?arrival=${iso(r.arrival)}&departure=${iso(r.departure)}&adults=${r.adults}`,
      directionsLink: `${env.WEB_URL}/kapchorwa/getting-here`,
      holdUntil: r.holdExpiresAt ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Kampala' }).format(r.holdExpiresAt) : '',
    };
    const facts: [string, string][] = [
      ['Booking', r.code],
      ['Arrive', `${vars.arrival} from ${s.checkInTime}`],
      ['Leave', `${vars.departure} by ${s.checkOutTime}`],
      ['Room', room],
      ['Rate', t(lt(r.ratePlan.name))],
      ['Guests', `${r.adults} adult${r.adults > 1 ? 's' : ''}${r.children ? `, ${r.children} child${r.children > 1 ? 'ren' : ''}` : ''}`],
      ...(r.extras.length ? (await this.prisma.extra.findMany({ where: { id: { in: r.extras.map((e) => e.extraId) } }, select: { id: true, name: true } })).map((e) => {
        const x = r.extras.find((y) => y.extraId === e.id)!;
        return [`${t(lt(e.name))} × ${x.quantity}`, money(x.totalMinor, r.currency)] as [string, string];
      }) : []),
      ['Total', vars.total!],
      ['Paid', vars.paid!],
      ['Balance at arrival', vars.balance!],
    ];
    return { r, vars, facts, recipient: { email: r.contact.email, phone: r.contact.phone, whatsappOptIn: r.contact.whatsappOptIn } as Recipient };
  }

  /* ───────── sending ───────── */

  private render(tpl: MessageTemplate, vars: Vars) {
    return {
      subject: tpl.subject ? fillTemplate(tpl.subject, vars) : null,
      heading: tpl.heading ? fillTemplate(tpl.heading, vars) : null,
      body: fillTemplate(tpl.body, vars).trim(),
    };
  }

  /**
   * Write one outbox row per channel and queue delivery. `channels` defaults to
   * every channel that has an active template and a way to reach the guest.
   */
  async send(key: string, o: { vars: Vars; to: Recipient; facts?: [string, string][]; channels?: MessageChannel[]; reservationId?: string; contactId?: string; sentBy?: AuthUser | null; dedupe?: boolean; immediate?: boolean }) {
    const tpls = await this.prisma.messageTemplate.findMany({ where: { key, locale: 'en', isActive: true, ...(o.channels ? { channel: { in: o.channels } } : {}) } });
    const out: OutboundMessage[] = [];
    for (const tpl of tpls) {
      if (tpl.channel === 'WHATSAPP' && !o.channels && !o.to.whatsappOptIn) continue;
      const to = tpl.channel === 'EMAIL' ? o.to.email : o.to.phone ? normalizePhone(o.to.phone) : null;
      if (!to) continue;
      if (o.dedupe && o.reservationId && (await this.prisma.outboundMessage.count({ where: { reservationId: o.reservationId, templateKey: key, channel: tpl.channel, status: { in: ['SENT', 'QUEUED', 'NOT_CONNECTED'] } } }))) continue;
      const m = this.render(tpl, o.vars);
      const actionVar = ACTION_VAR[key];
      const row = await this.prisma.outboundMessage.create({
        data: {
          channel: tpl.channel,
          to,
          templateKey: key,
          subject: m.subject,
          body: m.body,
          reservationId: o.reservationId ?? null,
          contactId: o.contactId ?? null,
          sentById: o.sentBy?.id ?? null,
        },
      });
      // What an email needs beyond its body, kept for retries.
      await this.redis.client.set(`msg:${row.id}`, JSON.stringify({ heading: m.heading, facts: templateDef(key)?.facts ? (o.facts ?? []) : [], action: tpl.actionLabel && actionVar && o.vars[actionVar] ? { label: tpl.actionLabel, url: o.vars[actionVar] } : null }), 'EX', 7 * 86_400);
      if (!o.immediate) await this.queue.add('deliver', { id: row.id }, { jobId: row.id });
      out.push(row);
    }
    return out;
  }

  /** Deliver while the person waits; on failure hand it to the queue to retry. */
  private async now(id: string, retry = true) {
    try {
      await this.deliver(id, !retry);
    } catch {
      if (retry) await this.queue.add('deliver', { id }, { jobId: id, delay: 15_000 });
    }
  }

  /** Called by the queue. Throws to retry; the last attempt records the failure. */
  private async deliver(id: string, lastAttempt: boolean) {
    const m = await this.prisma.outboundMessage.findUnique({ where: { id } });
    if (!m || m.status === 'SENT') return;
    await this.prisma.outboundMessage.update({ where: { id }, data: { attempts: { increment: 1 } } });
    try {
      const res = await this.dispatch(m);
      await this.prisma.outboundMessage.update({ where: { id }, data: { ...res, sentAt: res.status === 'SENT' ? new Date() : null, error: res.error ?? null } });
    } catch (e) {
      const error = (e as Error).message.slice(0, 500);
      await this.prisma.outboundMessage.update({ where: { id }, data: { status: lastAttempt ? 'FAILED' : 'QUEUED', error } });
      throw e;
    }
  }

  private async dispatch(m: OutboundMessage): Promise<{ status: 'SENT' | 'NOT_CONNECTED'; provider: string; providerRef?: string; fallbackUrl?: string; error?: string }> {
    if (m.channel === 'EMAIL') {
      const extra = JSON.parse((await this.redis.client.get(`msg:${m.id}`)) ?? '{}') as { heading?: string; facts?: [string, string][]; action?: { label: string; url: string } | null };
      const ref = await this.notifications.sendNow({ to: m.to, subject: m.subject ?? '', heading: extra.heading ?? m.subject ?? '', paragraphs: m.body.split(/\n{2,}/), facts: extra.facts, action: extra.action ?? undefined });
      return { status: 'SENT', provider: 'SMTP', providerRef: ref };
    }
    if (m.channel === 'SMS') {
      const c = await this.integrations.get('SMS_AFRICASTALKING');
      if (!c) return { status: 'NOT_CONNECTED', provider: 'SMS', error: 'SMS is not connected yet (Settings → Integrations).' };
      return { status: 'SENT', provider: 'AFRICASTALKING', providerRef: await this.sms(c, m.to, m.body) };
    }
    const c = await this.integrations.get('WHATSAPP_CLOUD');
    const fallbackUrl = whatsappLink(m.to, m.body);
    if (!c) return { status: 'NOT_CONNECTED', provider: 'WHATSAPP', fallbackUrl, error: 'WhatsApp Cloud API is not connected — send it with one tap from the link.' };
    const tpl = m.templateKey ? await this.prisma.messageTemplate.findFirst({ where: { key: m.templateKey, channel: 'WHATSAPP' } }) : null;
    return { status: 'SENT', provider: 'WHATSAPP_CLOUD', fallbackUrl, providerRef: await this.whatsapp(c, m, tpl) };
  }

  private async sms(c: ResolvedIntegration, to: string, text: string) {
    const body = new URLSearchParams({ username: c.values.username ?? '', to, message: text, ...(c.values.senderId ? { from: c.values.senderId } : {}) });
    const r = await fetch(`${africasTalkingBase(c.mode)}/version1/messaging`, { method: 'POST', headers: { apiKey: c.values.apiKey ?? '', accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(20_000) });
    const j = (await r.json().catch(() => ({}))) as { SMSMessageData?: { Message?: string; Recipients?: { status: string; messageId?: string; statusCode?: number }[] } };
    const rec = j.SMSMessageData?.Recipients?.[0];
    if (!r.ok || !rec || !['Success', 'Sent', 'Queued'].includes(rec.status)) throw new Error(`Africa's Talking: ${rec?.status ?? j.SMSMessageData?.Message ?? r.status}`);
    return rec.messageId ?? '';
  }

  /** Approved template when named (business-initiated); plain text otherwise (only inside the 24-hour window). */
  private async whatsapp(c: ResolvedIntegration, m: OutboundMessage, tpl: MessageTemplate | null) {
    let payload: Record<string, unknown>;
    if (tpl?.providerTemplate) {
      const ctx = m.reservationId ? (await this.reservationContext(m.reservationId)).vars : {};
      const params = templateVars(tpl.body).map((name) => ({ type: 'text', text: ctx[name] ?? '' }));
      payload = { messaging_product: 'whatsapp', to: digits(m.to), type: 'template', template: { name: tpl.providerTemplate, language: { code: c.values.templateLanguage || 'en' }, components: params.length ? [{ type: 'body', parameters: params }] : [] } };
    } else payload = { messaging_product: 'whatsapp', to: digits(m.to), type: 'text', text: { body: m.body, preview_url: true } };
    const r = await fetch(`${GRAPH}/${c.values.phoneNumberId}/messages`, { method: 'POST', headers: { authorization: `Bearer ${c.values.accessToken}`, 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20_000) });
    const j = (await r.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
    if (!r.ok) throw new Error(`WhatsApp: ${j.error?.message ?? r.status}`);
    return j.messages?.[0]?.id ?? '';
  }

  /* ───────── reservation events ───────── */

  async forReservation(key: string, reservationId: string, extra: Vars = {}, opts: { channels?: MessageChannel[]; sentBy?: AuthUser | null; dedupe?: boolean } = {}) {
    const ctx = await this.reservationContext(reservationId);
    return this.send(key, { vars: { ...ctx.vars, ...extra }, to: ctx.recipient, facts: ctx.facts, reservationId, contactId: ctx.r.contactId, ...opts });
  }

  /** The day before arrival, at 10:00 in Kapchorwa. Once per booking and channel. */
  @Cron('0 10 * * *', { timeZone: 'Africa/Kampala' })
  async preArrival() {
    const tomorrow = new Date(Date.parse(`${hotelToday()}T00:00:00Z`) + 86_400_000);
    const due = await this.prisma.reservation.findMany({ where: { status: 'CONFIRMED', arrival: tomorrow }, select: { id: true } });
    for (const r of due) await this.forReservation('stay.pre_arrival', r.id, {}, { dedupe: true }).catch((e) => this.log.error(e));
    if (due.length) this.log.log(`pre-arrival notes queued for ${due.length} booking(s)`);
  }

  /** A desk member sends a template on purpose. Returns what happened, with the wa.me link when not connected. */
  async sendByStaff(reservationId: string, key: string, channel: MessageChannel, actor: AuthUser): Promise<OutboundMessageDTO> {
    const def = templateDef(key);
    if (!def?.channels.includes(channel)) throw badRequest('That message is not available on this channel');
    const ctx = await this.reservationContext(reservationId);
    if (channel === 'EMAIL' ? !ctx.recipient.email : !ctx.recipient.phone) throw badRequest(`This guest has no ${channel === 'EMAIL' ? 'email address' : 'phone number'}`);
    const [row] = await this.send(key, { vars: ctx.vars, to: ctx.recipient, facts: ctx.facts, reservationId, contactId: ctx.r.contactId, channels: [channel], sentBy: actor, immediate: true });
    if (!row) throw badRequest('That message is switched off in Settings → Messages');
    await this.audit.record({ actor, action: 'message.send', entityType: 'Reservation', entityId: reservationId, summary: `Sent "${def.label}" by ${channel.toLowerCase()} to ${ctx.r.contact.name}` });
    // Deliver now so the desk sees the result; the queue retries on failure.
    await this.now(row.id);
    return (await this.outbox({ id: row.id }))[0]!;
  }

  /* ───────── templates (Settings → Messages) ───────── */

  async templates(): Promise<MessageTemplateDTO[]> {
    const rows = await this.prisma.messageTemplate.findMany({ orderBy: [{ key: 'asc' }, { channel: 'asc' }] });
    return rows.map((r) => ({ id: r.id, key: r.key, channel: r.channel, locale: r.locale, subject: r.subject, heading: r.heading, body: r.body, actionLabel: r.actionLabel, providerTemplate: r.providerTemplate, isActive: r.isActive, updatedAt: r.updatedAt.toISOString() }));
  }

  async updateTemplate(id: string, input: { subject?: string | null; heading?: string | null; body: string; actionLabel?: string | null; providerTemplate?: string | null; isActive?: boolean }, actor: AuthUser) {
    const tpl = await this.prisma.messageTemplate.findUnique({ where: { id } });
    if (!tpl) throw notFound('Template');
    const def = templateDef(tpl.key);
    const allowed = new Set(def?.vars.map((v) => v.name) ?? []);
    const unknown = [...templateVars(input.body), ...templateVars(input.subject ?? ''), ...templateVars(input.heading ?? '')].filter((v) => !allowed.has(v));
    if (unknown.length) throw new AppError(HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATION_FAILED', `Unknown ${unknown.length > 1 ? 'fields' : 'field'}: ${[...new Set(unknown)].map((u) => `{{${u}}}`).join(', ')}`, [{ path: 'body', message: `Use only: ${[...allowed].map((a) => `{{${a}}}`).join(' ')}` }]);
    if (tpl.channel === 'EMAIL' && !input.subject?.trim()) throw badRequest('An email needs a subject', [{ path: 'subject', message: 'Required' }]);
    await this.prisma.messageTemplate.update({ where: { id }, data: { subject: input.subject ?? null, heading: input.heading ?? null, body: input.body, actionLabel: input.actionLabel ?? null, providerTemplate: input.providerTemplate ?? null, isActive: input.isActive ?? tpl.isActive, updatedById: actor.id } });
    await this.audit.record({ actor, action: 'template.update', entityType: 'MessageTemplate', entityId: id, summary: `Edited "${def?.label ?? tpl.key}" (${tpl.channel.toLowerCase()})`, before: { body: tpl.body, subject: tpl.subject }, after: { body: input.body, subject: input.subject } });
    return this.templates();
  }

  async resetTemplate(id: string, actor: AuthUser) {
    const tpl = await this.prisma.messageTemplate.findUnique({ where: { id } });
    const d = tpl && DEFAULT_TEMPLATES.find((x) => x.key === tpl.key && x.channel === tpl.channel);
    if (!tpl || !d) throw notFound('Default template');
    await this.prisma.messageTemplate.update({ where: { id }, data: { subject: d.subject ?? null, heading: d.heading ?? null, body: d.body, actionLabel: d.actionLabel ?? null, updatedById: actor.id } });
    await this.audit.record({ actor, action: 'template.reset', entityType: 'MessageTemplate', entityId: id, summary: `Reset "${tpl.key}" (${tpl.channel.toLowerCase()}) to the original words` });
    return this.templates();
  }

  /** Send a template with sample values to the person editing it. */
  async testTemplate(id: string, to: string, actor: AuthUser) {
    const tpl = await this.prisma.messageTemplate.findUnique({ where: { id } });
    if (!tpl) throw notFound('Template');
    const def = templateDef(tpl.key)!;
    const vars = { ...Object.fromEntries(def.vars.map((v) => [v.name, v.sample])), ...(await this.settings()) } as Vars;
    const recipient = tpl.channel === 'EMAIL' ? { email: to } : { phone: to };
    const facts: [string, string][] = def.facts ? [['Booking', vars.code ?? 'RB-SAMPLE'], ['Arrive', vars.arrival ?? ''], ['Room', vars.room ?? '']] : [];
    const [row] = await this.send(tpl.key, { vars, to: recipient, facts, channels: [tpl.channel], sentBy: actor, immediate: true });
    if (!row) throw badRequest(tpl.channel === 'EMAIL' ? 'Enter an email address' : 'Enter a valid phone number');
    await this.prisma.outboundMessage.update({ where: { id: row.id }, data: { subject: `[TEST] ${row.subject ?? ''}`.trim() } });
    await this.now(row.id, false);
    return (await this.outbox({ id: row.id }))[0]!;
  }

  /* ───────── outbox ───────── */

  async outbox(q: { id?: string; status?: string; channel?: string; reservationId?: string; take?: number }): Promise<OutboundMessageDTO[]> {
    const where: Prisma.OutboundMessageWhereInput = {};
    if (q.id) where.id = q.id;
    if (q.status) where.status = q.status as never;
    if (q.channel) where.channel = q.channel as never;
    if (q.reservationId) where.reservationId = q.reservationId;
    const rows = await this.prisma.outboundMessage.findMany({ where, orderBy: { createdAt: 'desc' }, take: q.take ?? 200 });
    const res = await this.prisma.reservation.findMany({ where: { id: { in: rows.map((r) => r.reservationId).filter((x): x is string => !!x) } }, select: { id: true, code: true } });
    const staff = await this.prisma.user.findMany({ where: { id: { in: rows.map((r) => r.sentById).filter((x): x is string => !!x) } }, select: { id: true, name: true } });
    return rows.map((m) => ({
      id: m.id,
      channel: m.channel,
      to: m.to,
      templateKey: m.templateKey,
      subject: m.subject,
      body: m.body,
      status: m.status,
      provider: m.provider,
      error: m.error,
      fallbackUrl: m.fallbackUrl,
      reservation: res.find((r) => r.id === m.reservationId) ?? null,
      sentBy: staff.find((s) => s.id === m.sentById)?.name ?? null,
      createdAt: m.createdAt.toISOString(),
      sentAt: m.sentAt?.toISOString() ?? null,
    }));
  }

  async retry(id: string) {
    const m = await this.prisma.outboundMessage.findUnique({ where: { id } });
    if (!m) throw notFound('Message');
    if (m.status === 'SENT') throw badRequest('Already sent');
    await this.prisma.outboundMessage.update({ where: { id }, data: { status: 'QUEUED', error: null } });
    await this.now(id, false);
    return (await this.outbox({ id }))[0]!;
  }

  /* ───────── one-time codes for the stay lookup ───────── */

  /** Only when the owner switched it on and SMS is really connected. */
  async otpRequired() {
    const on = (await this.prisma.setting.findUnique({ where: { key: 'features.stayOtp' } }))?.value === true;
    return on && !!(await this.integrations.get('SMS_AFRICASTALKING'));
  }

  private hash(code: string, phone: string, otp: string) {
    return createHash('sha256').update(`${env.JWT_SECRET}:${code}:${phone}:${otp}`).digest('hex');
  }

  async startOtp(code: string, phone: string, reservationId: string) {
    const otp = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.stayOtp.create({ data: { code, phone, codeHash: this.hash(code, phone, otp), expiresAt: new Date(Date.now() + 10 * 60_000) } });
    const s = await this.settings();
    const [row] = await this.send('stay.otp', { vars: { otp, hotelName: s.hotelName }, to: { phone }, channels: ['SMS'], reservationId, immediate: true });
    if (!row) return;
    // One try only: a late code is useless, and the outbox keeps a record, never the code itself.
    await this.now(row.id, false);
    await this.prisma.outboundMessage.update({ where: { id: row.id }, data: { body: row.body.replace(otp, '••••••') } });
  }

  async verifyOtp(code: string, phone: string, otp: string) {
    const row = await this.prisma.stayOtp.findFirst({ where: { code, phone, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
    if (!row || row.attempts >= 5) return false;
    const ok = timingSafeEqual(Buffer.from(row.codeHash), Buffer.from(this.hash(code, phone, otp.trim())));
    await this.prisma.stayOtp.update({ where: { id: row.id }, data: ok ? { usedAt: new Date() } : { attempts: { increment: 1 } } });
    return ok;
  }
}
