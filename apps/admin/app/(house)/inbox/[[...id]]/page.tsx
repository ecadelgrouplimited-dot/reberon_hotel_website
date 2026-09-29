'use client';
import { use } from 'react';
import { Inbox } from '@/components/inbox/inbox';

export default function InboxPage({ params }: { params: Promise<{ id?: string[] }> }) {
  const { id } = use(params);
  return <Inbox selectedId={id?.[0] ?? null} />;
}
