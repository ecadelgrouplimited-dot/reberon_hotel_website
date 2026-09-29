import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { formatDate } from '@reberon/utils';
import { t } from '@reberon/contracts';
import { PrismaService } from '../../common/prisma.service.js';
import { Events, type EnquiryCreatedEvent, type WaitlistCreatedEvent } from '../../common/events.js';
import { env } from '../../config.js';
import { NotificationsService } from './notifications.service.js';

const INTENT_LABEL: Record<string, string> = { STAY: 'A stay', EVENT: 'An event or the hall', GROUP: 'A group', GENERAL: 'A question', WAITLIST: 'First stay' };

@Injectable()
export class NotificationsListener {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async settings() {
    const rows = await this.prisma.setting.findMany({ where: { key: { in: ['notifications.staffEmails', 'contact.responsePromise', 'contact.whatsapp', 'hotel.name'] } } });
    const s = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      staff: (s['notifications.staffEmails'] as string[] | undefined) ?? [],
      promise: t(s['contact.responsePromise'] as Record<string, string> | undefined) || 'We will reply soon.',
      whatsapp: (s['contact.whatsapp'] as string | undefined) ?? null,
    };
  }

  @OnEvent(Events.EnquiryCreated, { async: true })
  async onEnquiry(e: EnquiryCreatedEvent) {
    const c = await this.prisma.conversation.findUnique({ where: { id: e.conversationId }, include: { contact: true, messages: { take: 1, orderBy: { createdAt: 'asc' } } } });
    if (!c) return;
    const s = await this.settings();
    const ctx = c.context as Record<string, string | number | undefined>;
    const facts: [string, string][] = [
      ['Reference', c.reference],
      ['About', INTENT_LABEL[c.intent] ?? c.intent],
      ...(ctx.arrival ? [['Dates', `${formatDate(String(ctx.arrival))} → ${ctx.departure ? formatDate(String(ctx.departure)) : '?'}`] as [string, string]] : []),
      ...(ctx.adults ? [['Guests', `${ctx.adults} adult(s)${ctx.children ? `, ${ctx.children} child(ren)` : ''}`] as [string, string]] : []),
    ];
    if (c.contact.email) {
      await this.notifications.email({
        to: c.contact.email,
        subject: `We have your message (${c.reference})`,
        heading: `Thank you, ${c.contact.name.split(' ')[0]}.`,
        paragraphs: ['Your message reached the desk. A person — not a robot — will read it and reply.', s.promise],
        facts,
        action: s.whatsapp ? { label: 'Continue on WhatsApp', url: `https://wa.me/${s.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello, my reference is ${c.reference}.`)}` } : undefined,
        footnote: 'Keep the reference; it helps us find your message quickly.',
      });
    }
    for (const to of s.staff) {
      await this.notifications.email({
        to,
        replyTo: c.contact.email ?? undefined,
        subject: `New enquiry ${c.reference}: ${c.contact.name}`,
        heading: `${INTENT_LABEL[c.intent] ?? 'Enquiry'} from ${c.contact.name}`,
        paragraphs: [c.messages[0]?.body ?? ''],
        facts: [...facts, ['Phone', c.contact.phone ?? '—'], ['Email', c.contact.email ?? '—'], ['From page', String(ctx.pagePath ?? '—')]],
        action: { label: 'Open in the inbox', url: `${env.ADMIN_URL}/inbox/${c.id}` },
      });
    }
  }

  @OnEvent(Events.WaitlistCreated, { async: true })
  async onWaitlist(e: WaitlistCreatedEvent) {
    const w = await this.prisma.waitlistEntry.findUnique({ where: { id: e.entryId }, include: { contact: true, roomType: true } });
    if (!w) return;
    const s = await this.settings();
    const facts: [string, string][] = [
      ['Reference', w.reference],
      ['Room', w.roomType ? t(w.roomType.name as Record<string, string>) : 'Any room'],
      ['Dates', w.preferredFrom ? `${formatDate(w.preferredFrom)} → ${w.preferredTo ? formatDate(w.preferredTo) : '?'}${w.flexibleDates ? ' (flexible)' : ''}` : 'Flexible'],
      ['Guests', `${w.adults} adult(s)${w.children ? `, ${w.children} child(ren)` : ''}`],
    ];
    if (w.contact.email) {
      await this.notifications.email({
        to: w.contact.email,
        subject: `You are on the first-stay list (${w.reference})`,
        heading: 'Your name is on the list.',
        paragraphs: [
          `Thank you, ${w.contact.name.split(' ')[0]}. We will contact you on ${w.contact.phone ?? 'the number you gave'} before the calendar opens to anyone else.`,
          'This is not a booking and there is nothing to pay. When bookings open, a deposit turns your place into a reservation.',
        ],
        facts,
      });
    }
    for (const to of s.staff) {
      await this.notifications.email({
        to,
        subject: `First-stay list: ${w.contact.name} (${w.reference})`,
        heading: `${w.contact.name} wants a first stay`,
        paragraphs: [w.note ?? 'No note.'],
        facts: [...facts, ['Phone', w.contact.phone ?? '—'], ['Email', w.contact.email ?? '—']],
        action: { label: 'Open the waitlist', url: `${env.ADMIN_URL}/waitlist?open=${w.id}` },
      });
    }
  }
}
