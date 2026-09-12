'use client';

import { useMemo, useRef, useState } from 'react';
import { Trash2, GripVertical, Pencil, Check, X, Wand2, Loader2 } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LevelBadge } from '@/components/risk-badge';
import { aggregateHits, replaceAllWord } from '@/lib/scanner';
import { cn } from '@/lib/utils';
import type { BriefModule, ScanResult } from '@/lib/types';

const LEVEL_BG = {
  high: 'bg-red-100/80 text-red-700',
  medium: 'bg-amber-100/80 text-amber-700',
  low: 'bg-sky-100/80 text-sky-700',
} as const;

export function ModuleCard({
  module: mod,
  scanResult,
  generating,
  canDelete,
  onChange,
  onDelete,
}: {
  module: BriefModule;
  scanResult: ScanResult;
  generating: boolean;
  canDelete: boolean;
  onChange: (patch: Partial<BriefModule>) => void;
  onDelete: () => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(mod.title);
  const [polishing, setPolishing] = useState(false);
  const [polishError, setPolishError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const { settings } = useAppState();

  const aggregated = useMemo(() => aggregateHits(scanResult), [scanResult]);
  const riskCount = scanResult.total;

  /** 同步 textarea 滚动到高亮叠层 */
  const syncScroll = () => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const renderBackdrop = () => {
    if (!mod.content) return null;
    const out: React.ReactNode[] = [];
    let cursor = 0;
    scanResult.hits.forEach((hit, i) => {
      if (hit.start < cursor) return;
      if (hit.start > cursor) {
        out.push(
          <span key={`t${i}`} className="text-transparent">
            {mod.content.slice(cursor, hit.start)}
          </span>,
        );
      }
      out.push(
        <mark
          key={`h${i}`}
          className={cn('rounded-sm', LEVEL_BG[hit.level])}
        >
          {mod.content.slice(hit.start, hit.end)}
        </mark>,
      );
      cursor = hit.end;
    });
    if (cursor < mod.content.length) {
      out.push(
        <span key="tail" className="text-transparent">
          {mod.content.slice(cursor)}
        </span>,
      );
    }
    return out;
  };

  const replaceWord = (word: string, suggestion: string) => {
    onChange({ content: replaceAllWord(mod.content, word, suggestion) });
  };

  /** AI 合规改写：仅针对当前模块命中的风险词 */
  const aiPolish = async () => {
    if (!mod.content.trim() || polishing) return;
    const items = aggregated.map((a) => ({
      word: a.word,
      suggestion: a.suggestion,
    }));
    setPolishing(true);
    setPolishError('');
    try {
      const resp = await fetch('/api/ai/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: mod.content,
          items,
          model: settings.aiModel,
          temperature: settings.aiTemperature,
        }),
      });
      const data = (await resp.json()) as { text?: string; error?: string };
      if (!resp.ok || !data.text) {
        throw new Error(data.error ?? '改写失败，请稍后重试');
      }
      onChange({ content: data.text.trim() });
    } catch (e) {
      setPolishError(e instanceof Error ? e.message : '改写失败');
    } finally {
      setPolishing(false);
    }
  };

  return (
    <section
      className={cn(
        'module-enter rounded-xl border bg-white transition-shadow',
        riskCount > 0
          ? scanResult.highCount > 0
            ? 'border-red-200'
            : scanResult.mediumCount > 0
              ? 'border-amber-200'
              : 'border-sky-200'
          : 'border-line hover:shadow-card',
      )}
    >
      {/* 模块头 */}
      <header className="flex items-center gap-2 border-b border-line/70 px-4 py-2.5">
        <GripVertical size={14} className="shrink-0 cursor-grab text-slate-300" />
        {editingTitle ? (
          <span className="flex items-center gap-1">
            <Input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              className="h-7 w-40 text-[13.5px] font-semibold"
              autoFocus
            />
            <button
              type="button"
              className="rounded p-1 text-emerald-600 hover:bg-slate-100"
              onClick={() => {
                if (titleDraft.trim()) onChange({ title: titleDraft.trim() });
                setEditingTitle(false);
              }}
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              className="rounded p-1 text-slate-400 hover:bg-slate-100"
              onClick={() => {
                setTitleDraft(mod.title);
                setEditingTitle(false);
              }}
            >
              <X size={14} />
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="group/title flex min-w-0 items-center gap-1.5"
            onClick={() => {
              setTitleDraft(mod.title);
              setEditingTitle(true);
            }}
            title="点击重命名模块"
          >
            <h3 className="truncate text-[13.5px] font-semibold">{mod.title}</h3>
            <Pencil
              size={11}
              className="shrink-0 text-slate-300 group-hover/title:text-slate-500"
            />
          </button>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {riskCount > 0 ? (
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                scanResult.highCount > 0
                  ? 'border-red-200 bg-red-50 text-red-600'
                  : scanResult.mediumCount > 0
                    ? 'border-amber-200 bg-amber-50 text-amber-600'
                    : 'border-sky-200 bg-sky-50 text-sky-600',
              )}
            >
              {riskCount} 处风险
            </span>
          ) : mod.content.trim() ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
              合规
            </span>
          ) : null}
          {riskCount > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 gap-1 px-2 text-[11px] text-primary"
              onClick={aiPolish}
              disabled={polishing || generating}
              title="由 AI 按替换建议改写本模块内容"
            >
              {polishing ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Wand2 size={11} />
              )}
              {polishing ? '改写中…' : 'AI 合规改写'}
            </Button>
          )}
          {canDelete && (
            <button
              type="button"
              title="删除模块"
              onClick={onDelete}
              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </header>

      {/* 实时高亮编辑区：textarea 透明文字叠在高亮层之上 */}
      <div className="relative">
        <div
          ref={backdropRef}
          aria-hidden
          className="thin-scroll pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words px-3 py-2 text-[13px] leading-[1.8] tracking-normal"
        >
          {renderBackdrop()}
          {/* 末尾占位，保证高度与 textarea 一致 */}
          {mod.content.endsWith('\n') ? '\n\u200b' : ''}
        </div>
        <Textarea
          ref={textareaRef}
          value={mod.content}
          onChange={(e) => onChange({ content: e.target.value })}
          onScroll={syncScroll}
          placeholder={placeholderOf(mod.key)}
          disabled={generating}
          className="thin-scroll relative min-h-[112px] resize-y rounded-none border-0 bg-transparent text-[13px] leading-[1.8] text-slate-800 caret-primary focus-visible:ring-0"
        />
      </div>

      {/* 命中建议条 */}
      {riskCount > 0 && (
        <div className="space-y-1.5 border-t border-line/70 bg-slate-50/70 px-4 py-2.5">
          {aggregated.map((agg) => (
            <div
              key={agg.word}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
            >
              <LevelBadge level={agg.level} size="xs" />
              <span className="font-medium text-slate-800">「{agg.word}」</span>
              <span className="text-muted-foreground">
                ×{agg.count} · {agg.reason}
              </span>
              <span className="hidden text-slate-300 md:inline">→</span>
              <span className="text-emerald-700">
                建议改为「{agg.suggestion}」
              </span>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto h-6 px-2 text-[11px]"
                onClick={() => replaceWord(agg.word, agg.suggestion)}
              >
                一键替换
              </Button>
            </div>
          ))}
          {polishError && (
            <p className="pt-0.5 text-[11px] text-red-500">{polishError}</p>
          )}
        </div>
      )}
    </section>
  );
}

function placeholderOf(key: string): string {
  const map: Record<string, string> = {
    background: '简述品牌/车型背景、传播缘起与市场环境…',
    objective: '本次传播要达成的认知、态度或行为目标…',
    audience: '人群画像、使用场景、核心洞察…',
    sellingPoints: '产品核心卖点，建议分条列出…',
    keyMessage: '主传播口号 / 核心信息（需合规表述）…',
    deliverables: '如 TVC、海报、KOL 软文、新闻稿等…',
    channels: '投放平台与渠道组合…',
    timeline: '预热 / 爆发 / 长尾各阶段时间节点…',
    budget: '预算区间或分配方式…',
    kpi: '曝光、互动、线索等可量化指标…',
    notes: '法务/品牌口径等合规要求…',
  };
  return map[key] ?? '输入模块内容…';
}
