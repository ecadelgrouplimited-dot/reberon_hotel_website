'use client';
import { use } from 'react';
import { EntityEditor } from '@/components/forms/entity-editor';
import { facilityConfig } from '@/components/content/configs';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <EntityEditor config={facilityConfig} id={use(params).id} />;
}
