'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { FileText, ArrowRight, LayoutGrid } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { QuickGenerate } from '@/components/home/quick-generate';
import { useAppState } from '@/hooks/useAppState';
import { OverallRiskTag } from '@/components/risk-badge';
import { formatDate } from '@/lib/utils';

export default function HomePage() {
  const { briefs } = useAppState();

  const recent = useMemo(
    () =>
      [...briefs]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 6),
    [briefs],
  );

  return (
    <AppShell>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto bg-page-bg">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <header className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight">Brief 智能工作台</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              从原始素材到结构化、合规的传播 Brief，只需一步。粘贴资料或上传文件，AI 自动完成撰写与违禁词审核。
            </p>
          </header>

          <QuickGenerate />

          {recent.length > 0 && (
            <section className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[14px] font-semibold">最近的 Brief</h2>
                <Link
                  href="/briefs"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <LayoutGrid size={13} />
                  查看全部
                </Link>
              </div>
              <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {recent.map((brief) => (
                  <li key={brief.id}>
                    <Link
                      href={`/briefs/${brief.id}`}
                      className="group flex items-start gap-3 rounded-lg border border-line bg-white p-3.5 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/[0.02]"
                    >
                      <FileText size={16} className="mt-0.5 shrink-0 text-slate-400 group-hover:text-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-medium">
                          {brief.title}
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-muted-foreground">
                            {formatDate(brief.updatedAt)} · {brief.modules.length} 个模块
                          </span>
                          <OverallRiskTag
                            result={{
                              total: brief.issueCount,
                              highCount: brief.highCount,
                              mediumCount: brief.mediumCount,
                              lowCount: brief.lowCount,
                            }}
                          />
                        </div>
                      </div>
                      <ArrowRight
                        size={14}
                        className="mt-1 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}
