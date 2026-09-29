'use client';
import { use } from 'react';
import { EntityEditor } from '@/components/forms/entity-editor';
import { progressConfig } from '@/components/content/configs';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <EntityEditor config={progressConfig} id={use(params).id} />;
}
