'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Hammer, Image as ImageIcon, FileText } from 'lucide-react';
import type { DashboardDTO } from '@reberon/contracts';
import { t } from '@reberon/contracts/text';
import { get } from '@/lib/api';
import { useCan, useMe } from '@/lib/providers';
import { ago, dateRange } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Section, Skeleton, Status, Pill } from '@/components/ui/bits';
import { BarList, ColumnChart, StatTile } from '@/components/charts/charts';

const CHANNEL: Record<string, string> = { WEB_FORM: 'Website', WHATSAPP: 'WhatsApp', EMAIL: 'Email', PHONE: 'Phone' };

function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Africa/Kampala' }).format(new Date()));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Today() {
  const me = useMe();
  const can = useCan();
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: () => get<DashboardDTO>('/dashboard'), refetchInterval: 60_000 });
  const today = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Kampala' }).format(new Date());

  return (
    <div className="fade-in">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12.5px] font-medium text-fg-subtle">{today} · Kapchorwa</p>
          <h1 className="display mt-1 text-[2.1rem] leading-tight">
            {greeting()}, {me.name.split(' ')[0]}.
          </h1>
        </div>
        {can('content:write') && (
          <div className="flex flex-wrap gap-2">
            <Button href="/website/rising/new" icon={<Hammer className="size-4" />}>Post progress</Button>
            <Button href="/media?upload=1" icon={<ImageIcon className="size-4" />}>Upload photos</Button>
            <Button href="/website/pages" variant="dark" icon={<FileText className="size-4" />}>Edit the website</Button>
          </div>
        )}
      </header>

      {isLoading || !data ? (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
          <Skeleton className="h-72" />
        </div>
      ) : (
        <div className="grid gap-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="New enquiries (24 h)" value={data.counts.newEnquiries24h} note={`${data.counts.openConversations} conversations still open`} href="/inbox" />
            <StatTile label="First-stay list" value={data.counts.waitlistTotal} note={`${data.counts.waitlistNew} not yet contacted`} href="/waitlist" />
            <StatTile label="Hotel built" value={data.progress.percent !== null ? `${data.progress.percent}%` : '—'} note={data.progress.lastUpdate ? `Last update ${ago(data.progress.lastUpdate)}` : 'No updates yet'} href="/website/rising" />
            <StatTile label="Unpublished page changes" value={data.counts.draftPages} note={`${data.counts.mediaCount} photos & drawings in the library`} href="/website/pages" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <Section title="Enquiries" description="Website, WhatsApp, email and phone — every channel, one count.">
              <ColumnChart data={data.enquiriesByDay} label="Enquiries per day" />
            </Section>
            <Section title="First-stay list by room" description="Names waiting (new or contacted).">
              {data.waitlistByRoomType.length ? <BarList data={data.waitlistByRoomType.map((r) => ({ label: t(r.name), value: r.count }))} /> : <p className="text-[13px] text-fg-muted">No names yet.</p>}
            </Section>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Section title="Latest in the inbox" actions={<Link href="/inbox" className="flex items-center gap-1 text-[12.5px] font-semibold text-fg-muted hover:text-fg">Open inbox <ArrowRight className="size-3.5" /></Link>}>
              <ul className="-my-2 divide-y divide-line">
                {data.latestConversations.map((c) => (
                  <li key={c.id}>
                    <Link href={`/inbox/${c.id}`} className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-3 hover:bg-surface-2">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-[12px] font-semibold">{c.contact.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className={c.unread ? 'font-semibold' : 'font-medium'}>{c.contact.name}</span>
                          <span className="text-[11.5px] text-fg-subtle">{CHANNEL[c.channel]}</span>
                          <span className="ml-auto text-[11.5px] text-fg-subtle">{ago(c.lastMessageAt)}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-[12.5px] text-fg-muted">{c.preview}</span>
                      </span>
                      <Status value={c.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Newest on the first-stay list" actions={<Link href="/waitlist" className="flex items-center gap-1 text-[12.5px] font-semibold text-fg-muted hover:text-fg">Open list <ArrowRight className="size-3.5" /></Link>}>
              <ul className="-my-2 divide-y divide-line">
                {data.latestWaitlist.map((w) => (
                  <li key={w.id}>
                    <Link href={`/waitlist?open=${w.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-surface-2">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{w.contact.name}</span>
                        <span className="block text-[12.5px] text-fg-muted">
                          {w.roomType ? t(w.roomType.name) : 'Any room'} · {dateRange(w.preferredFrom, w.preferredTo)}
                        </span>
                      </span>
                      <span className="text-[11.5px] text-fg-subtle">{ago(w.createdAt)}</span>
                      <Status value={w.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          <Section title="Recent activity" description="Every change in the House is recorded.">
            <ol className="relative grid gap-3 border-l border-line pl-5">
              {data.recentActivity.map((a) => (
                <li key={a.id} className="relative text-[13px]">
                  <span className="absolute -left-[23.5px] top-1.5 size-2 rounded-full border-2 border-surface bg-line-strong" />
                  <span className="font-medium">{a.actor?.name ?? (a.actorType === 'GUEST' ? 'A guest' : 'System')}</span> <span className="text-fg-muted">{a.summary}</span>
                  <span className="ml-2 text-[11.5px] text-fg-subtle">{ago(a.createdAt)}</span>
                  {a.actorType === 'GUEST' && <Pill tone="blue" className="ml-2">website</Pill>}
                </li>
              ))}
            </ol>
          </Section>
        </div>
      )}
    </div>
  );
}
