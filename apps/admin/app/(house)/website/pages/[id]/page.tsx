'use client';
import { use } from 'react';
import { PageBuilder } from '@/components/builder/page-builder';

export default function EditPage({ params }: { params: Promise<{ id: string }> }) {
  return <PageBuilder id={use(params).id} />;
}
