'use client';

import { use } from 'react';
import { AppShell } from '@/components/app-shell';
import { BriefEditor } from '@/components/brief/brief-editor';

export default function BriefDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <AppShell>
      <BriefEditor briefId={id} />
    </AppShell>
  );
}
