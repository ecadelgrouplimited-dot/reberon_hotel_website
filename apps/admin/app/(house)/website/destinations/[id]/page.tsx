'use client';
import { use } from 'react';
import { EntityEditor } from '@/components/forms/entity-editor';
import { destinationConfig } from '@/components/content/configs';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <EntityEditor config={destinationConfig} id={use(params).id} />;
}
