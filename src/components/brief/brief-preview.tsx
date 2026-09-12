'use client';

import { ShieldCheck, ShieldAlert } from 'lucide-react';
import type { Brief, ScanResult } from '@/lib/types';
import { LevelBadge } from '@/components/risk-badge';
import { BlocksView } from '@/components/brief/blocks-view';
import { formatDate } from '@/lib/utils';

export function BriefPreview({
  brief,
  result,
  generating,
}: {
  brief: Brief;
  result: ScanResult;
  generating: boolean;
}) {
  const filled = brief.modules.filter((m) => m.content.trim());

  return (
    <div className="thin-scroll min-h-0 flex-1 overflow-y-auto bg-page-bg">
      <div className="mx-auto max-w-[820px] px-6 py-8">
        {/* 文档纸张 */}
        <article className="rounded-lg border border-line bg-white px-12 py-12 shadow-sm">
          {/* 文档头 */}
          <header className="border-b border-line pb-6">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-primary">
              <ShieldCheck size={13} />
              传播 Brief · 合规版
            </div>
            <h1 className="mt-3 text-[26px] font-semibold leading-snug tracking-tight text-foreground">
              {brief.title || '未命名 Brief'}
            </h1>
            {brief.project && (
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                关联项目 / 车型：{brief.project}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground">
              <span>生成时间：{formatDate(brief.updatedAt)}</span>
              {brief.sourceName && <span>素材来源：{brief.sourceName}</span>}
            </div>
          </header>

          {/* 合规结论条 */}
          <div
            className={
              result.total === 0
                ? 'mt-6 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[12.5px] text-emerald-700'
                : 'mt-6 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-[12.5px] text-amber-700'
            }
          >
            {result.total === 0 ? (
              <>
                <ShieldCheck size={15} />
                合规扫描：{filled.length} 个模块未发现风险表述，可进入评审 / 导出
              </>
            ) : (
              <>
                <ShieldAlert size={15} />
                合规扫描：仍有 {result.total} 处待处理表述
                <span className="flex items-center gap-2 pl-1">
                  <span className="flex items-center gap-1">
                    <LevelBadge level="high" size="xs" />
                    {result.highCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <LevelBadge level="medium" size="xs" />
                    {result.mediumCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <LevelBadge level="low" size="xs" />
                    {result.lowCount}
                  </span>
                </span>
                <span className="text-amber-600/80">· 建议返回编辑处理后再导出</span>
              </>
            )}
          </div>

          {/* 模块正文 */}
          <div className="mt-8 space-y-9">
            {brief.modules.length === 0 && !generating && (
              <p className="py-12 text-center text-sm text-muted-foreground">
                暂无内容，请返回编辑生成
              </p>
            )}
            {brief.modules.map((mod, idx) => (
              <section key={mod.id} className="scroll-mt-6">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[13px] font-semibold tabular-nums text-primary">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <h2 className="text-[16px] font-semibold text-foreground">
                    {mod.title}
                  </h2>
                </div>
                <div className="mt-2.5 border-l-2 border-line pl-4">
                  <BlocksView text={mod.content} generating={generating} />
                </div>
              </section>
            ))}
          </div>

          <footer className="mt-12 border-t border-line pt-4 text-[11px] leading-relaxed text-slate-400">
            本 Brief 由 AI 依据所提供素材生成，并经内置 564 条违禁词库实时合规扫描；内容仅供内部传播工作参考，性能参数与承诺类表述请以官方公告与法务复核为准。
          </footer>
        </article>
      </div>
    </div>
  );
}
