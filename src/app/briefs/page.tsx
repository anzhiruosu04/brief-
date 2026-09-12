'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell, PageHeader } from '@/components/app-shell';
import { BriefListPane } from '@/components/brief/brief-list-pane';
import { useAppState } from '@/hooks/useAppState';
import { EmptyState } from '@/components/empty-state';

export default function BriefsIndexPage() {
  const router = useRouter();
  const { ready, briefs, createNewBrief } = useAppState();

  // 默认打开最近一个 Brief，否则展示空态引导
  useEffect(() => {
    if (ready && briefs.length > 0) {
      router.replace(`/briefs/${briefs[0].id}`);
    }
  }, [ready, briefs, router]);

  return (
    <AppShell>
      <PageHeader title="Brief 工作台" description="素材解析 · AI 生成结构化 Brief · 实时合规扫描" />
      <div className="flex min-h-0 flex-1">
        <div className="w-72 shrink-0 border-r border-line">
          <BriefListPane />
        </div>
        <div className="flex-1">
          <EmptyState
            title="从一份素材开始"
            description="粘贴产品资料、上传 DOCX/PDF/TXT 文件或读取飞书文档，AI 将生成包含项目背景、传播目标、核心卖点等模块的结构化 Brief，并对每个模块实时进行违禁词扫描。"
            actionLabel="新建 Brief"
            onAction={() => {
              const brief = createNewBrief();
              router.push(`/briefs/${brief.id}`);
            }}
          />
        </div>
      </div>
    </AppShell>
  );
}
