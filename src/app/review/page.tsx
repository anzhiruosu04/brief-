'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileUp,
  ImageUp,
  Loader2,
  Trash2,
  Download,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ListChecks,
  Crosshair,
  Lightbulb,
  ClipboardPaste,
} from 'lucide-react';
import { AppShell, PageHeader } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DropZone } from '@/components/material/drop-zone';
import { useAppState } from '@/hooks/useAppState';
import { useBriefReview, type ReviewIssue } from '@/hooks/useBriefReview';
import { importMaterial, type ImportedMaterial } from '@/lib/fileParser';
import { exportReviewReportToDocx } from '@/lib/docxExport';
import { loadReviewDraft, saveReviewDraft } from '@/lib/storage';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Side = 'brief' | 'draft';

export default function ReviewPage() {
  const { briefs, settings } = useAppState();
  const review = useBriefReview();

  const [briefText, setBriefText] = useState('');
  const [draftText, setDraftText] = useState('');
  const [briefName, setBriefName] = useState('');
  const [draftName, setDraftName] = useState('');
  const [busySide, setBusySide] = useState<Side | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const draftRef = useRef<HTMLTextAreaElement>(null);
  const briefFileRef = useRef<HTMLInputElement>(null);
  const draftFileRef = useRef<HTMLInputElement>(null);
  // 记录最近聚焦的输入区，决定粘贴截图填入哪一侧（两个 DropZone 均监听全局 paste，用它去重）。
  const pasteSideRef = useRef<Side>('brief');

  // 打开页面时恢复上一次两侧内容（仅客户端读取，避免 hydration 不匹配）。
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setBriefText(loadReviewDraft('brief'));
    setDraftText(loadReviewDraft('draft'));
    setHydrated(true);
  }, []);

  // 内容变更自动留存到本地，再次打开无需重新输入。
  useEffect(() => {
    if (hydrated) saveReviewDraft('brief', briefText);
  }, [briefText, hydrated]);
  useEffect(() => {
    if (hydrated) saveReviewDraft('draft', draftText);
  }, [draftText, hydrated]);

  const savedBriefs = useMemo(
    () => briefs.filter((b) => (b.modules ?? []).some((m) => m.content.trim())),
    [briefs],
  );

  const applyImport = (side: Side, m: ImportedMaterial) => {
    if (side === 'brief') {
      setBriefText(m.text);
      setBriefName(m.name);
    } else {
      setDraftText(m.text);
      setDraftName(m.name);
    }
    toast.success(
      m.kind === 'image' ? '图片文字识别完成' : `已解析 ${m.name}，共 ${m.text.length} 字`,
    );
  };

  const handleFile = async (side: Side, file: File | undefined) => {
    if (!file) return;
    setBusySide(side);
    try {
      const m = await importMaterial(file, { ocrModel: settings.aiModel });
      applyImport(side, m);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '素材导入失败');
    } finally {
      setBusySide(null);
    }
  };

  const fillSavedBrief = (id: string) => {
    const b = briefs.find((x) => x.id === id);
    if (!b) return;
    const text = b.modules
      .map((m) => `${m.title}\n${m.content}`)
      .filter((s) => s.trim())
      .join('\n\n');
    setBriefText(text);
    setBriefName(b.title || '已保存的 Brief');
  };

  const canRun = briefText.trim() && draftText.trim() && !review.loading;

  const run = () => {
    if (!briefText.trim()) {
      toast.error('请先放入 Brief 基准文档');
      return;
    }
    if (!draftText.trim()) {
      toast.error('请先放入待审核草稿');
      return;
    }
    setShowSuggestions(false);
    void review.start({
      brief: briefText,
      draft: draftText,
      model: settings.aiModel,
    });
  };

  // 点击违规项：在右侧草稿中定位并选中对应原文。
  const locate = (issue: ReviewIssue) => {
    const q = issue.quote?.trim();
    const ta = draftRef.current;
    if (!q || !ta) {
      toast('该条未提供可定位的原文，请在草稿中人工核对', { icon: <AlertTriangle className="h-4 w-4 text-amber-600" /> });
      return;
    }
    const idx = draftText.indexOf(q);
    if (idx === -1) {
      // 容忍空白差异：压缩空白后再匹配
      const compact = (s: string) => s.replace(/\s+/g, '');
      const target = compact(q);
      const hay = compact(draftText);
      const ci = hay.indexOf(target);
      if (ci === -1) {
        toast('草稿可能已修改，未找到对应原文', { icon: <AlertTriangle className="h-4 w-4 text-amber-600" /> });
        return;
      }
      // 压缩后定位无法精确映射原始下标，仅滚动到顶部并提示
      ta.focus();
      ta.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast('已定位到草稿区（空白有差异，请人工核对该句）');
      return;
    }
    ta.focus();
    ta.setSelectionRange(idx, idx + q.length);
    const before = draftText.slice(0, idx);
    const lineHeight = 24;
    ta.scrollTop = Math.max(0, before.split('\n').length * lineHeight - 80);
  };

  const r = review.result;
  const clearAll = () => {
    review.reset();
    setBriefText('');
    setDraftText('');
    setBriefName('');
    setDraftName('');
  };

  return (
    <AppShell>
      <PageHeader
        title="Brief对照审核"
        description="左侧放入 Brief 基准文档，右侧放入待审核草稿，核对 Brief 明确要求必须有却缺失、明确不能有却出现的内容"
        actions={
          <>
            {r && (r.missing.length > 0 || r.violations.length > 0 || r.summary) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  exportReviewReportToDocx({
                    briefTitle: briefName || '未命名 Brief',
                    verdict: r.verdict,
                    summary: r.summary,
                    missing: r.missing,
                    violations: r.violations,
                    suggestions: r.suggestions,
                  }).catch(() => toast.error('导出失败，请重试'))
                }
              >
                <Download className="mr-1.5 h-4 w-4" />
                导出 Word
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <Trash2 className="mr-1.5 h-4 w-4" />
              清空
            </Button>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* 双输入区 */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* 左：Brief 基准 */}
          <InputCard
            side="brief"
            title="Brief 基准文档"
            hint="审核依据：系统只读这里明确写出的硬性要求"
            name={briefName}
            busy={busySide === 'brief'}
            savedBriefs={savedBriefs.map((b) => ({ id: b.id, title: b.title || '未命名 Brief' }))}
            onPick={fillSavedBrief}
            onUpload={() => briefFileRef.current?.click()}
            onOcr={() => briefFileRef.current?.click()}
          >
            <DropZone
              fill={false}
              pasteEnabled={() => pasteSideRef.current === 'brief'}
              onImport={(m) => applyImport('brief', m)}
              className="h-full"
            >
              <Textarea
                value={briefText}
                onChange={(e) => setBriefText(e.target.value)}
                onFocus={() => {
                  pasteSideRef.current = 'brief';
                }}
                placeholder={
                  '点击后直接粘贴（Cmd/Ctrl+V）Brief 全文；也可从上方选择已保存的 Brief，或上传 Word / PDF / 拖入文档与截图。\n\n系统将提取其中「必须 / 务必 / 不得 / 禁止」等明确要求作为核对依据。'
                }
                className="min-h-[300px] resize-y rounded-lg border-line text-[13px] leading-relaxed"
              />
            </DropZone>
            <input
              ref={briefFileRef}
              type="file"
              accept=".docx,.pdf,.txt,.md,.csv,image/*"
              className="hidden"
              onChange={(e) => handleFile('brief', e.target.files?.[0])}
            />
          </InputCard>

          {/* 右：待审核草稿 */}
          <InputCard
            side="draft"
            title="待审核草稿"
            hint="写好的文案草稿：口播稿 / 推文 / 视频脚本等"
            name={draftName}
            busy={busySide === 'draft'}
            onUpload={() => draftFileRef.current?.click()}
            onOcr={() => draftFileRef.current?.click()}
          >
            <DropZone
              fill={false}
              pasteEnabled={() => pasteSideRef.current === 'draft'}
              onImport={(m) => applyImport('draft', m)}
              className="h-full"
            >
              <Textarea
                ref={draftRef}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onFocus={() => {
                  pasteSideRef.current = 'draft';
                }}
                placeholder={
                  '点击后直接粘贴（Cmd/Ctrl+V）待审核文案；也可上传 Word / PDF / 拖入文档与微信、飞书截图（光标在哪个框，截图识别结果就填入哪个框）。\n\n审核完成后，点击下方违规项可在此处定位并选中对应原文。'
                }
                className="min-h-[300px] resize-y rounded-lg border-line text-[13px] leading-relaxed"
              />
            </DropZone>
            <input
              ref={draftFileRef}
              type="file"
              accept=".docx,.pdf,.txt,.md,.csv,image/*"
              className="hidden"
              onChange={(e) => handleFile('draft', e.target.files?.[0])}
            />
          </InputCard>
        </div>

        {/* 操作条 */}
        <div className="mt-4 flex items-center justify-center">
          <Button onClick={run} disabled={!canRun} className="px-8">
            {review.loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在对照审核…
              </>
            ) : (
              <>
                <ListChecks className="mr-2 h-4 w-4" />
                开始对照审核
              </>
            )}
          </Button>
        </div>

        {review.error && (
          <div className="mx-auto mt-4 flex max-w-3xl items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {review.error}
          </div>
        )}

        {/* 结果区 */}
        {(review.loading || r) && (
          <ResultPanel
            loading={review.loading}
            result={r}
            onLocate={locate}
            showSuggestions={showSuggestions}
            toggleSuggestions={() => setShowSuggestions((v) => !v)}
          />
        )}
      </div>
    </AppShell>
  );
}

function InputCard(props: {
  side: Side;
  title: string;
  hint: string;
  name?: string;
  busy: boolean;
  savedBriefs?: Array<{ id: string; title: string }>;
  onPick?: (id: string) => void;
  onUpload: () => void;
  onOcr: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-lg border border-line bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <span
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold',
            props.side === 'brief'
              ? 'bg-primary/10 text-primary'
              : 'bg-slate-100 text-slate-600',
          )}
        >
          {props.side === 'brief' ? '基' : '稿'}
        </span>
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold">{props.title}</div>
          <div className="text-[11px] text-muted-foreground">{props.hint}</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {props.savedBriefs && props.savedBriefs.length > 0 && (
            <Select onValueChange={(v) => props.onPick?.(v)}>
              <SelectTrigger size="sm" className="h-8 w-[150px] text-xs">
                <SelectValue placeholder="选择已存 Brief" />
              </SelectTrigger>
              <SelectContent>
                {props.savedBriefs.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">
                    <span className="truncate">{b.title}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={props.onUpload}>
            {props.busy ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileUp className="mr-1 h-3.5 w-3.5" />
            )}
            文件
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={props.onOcr}>
            <ImageUp className="mr-1 h-3.5 w-3.5" />
            图片
          </Button>
        </div>
      </div>
      {props.name && (
        <div className="flex items-center gap-1.5 border-b border-line bg-slate-50/60 px-4 py-1.5 text-[11px] text-muted-foreground">
          <ClipboardPaste className="h-3 w-3" />
          来源：{props.name}
        </div>
      )}
      <div className="flex flex-1 flex-col p-3">{props.children}</div>
    </div>
  );
}

function ResultPanel(props: {
  loading: boolean;
  result: ReturnType<typeof useBriefReview>['result'];
  onLocate: (issue: ReviewIssue) => void;
  showSuggestions: boolean;
  toggleSuggestions: () => void;
}) {
  const { loading, result } = props;
  if (!result) {
    return (
      <div className="mx-auto mt-6 max-w-3xl rounded-lg border border-line bg-white px-6 py-10 text-center text-sm text-muted-foreground">
        <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-primary" />
        正在通读 Brief 要求并逐条核对草稿…
      </div>
    );
  }

  const missCount = result.missing.length;
  const vioCount = result.violations.length;
  const failed = missCount + vioCount > 0 || result.verdict === 'fail';

  return (
    <div className="mx-auto mt-6 max-w-5xl space-y-4">
      {/* 总览 */}
      <div
        className={cn(
          'flex items-start gap-3 rounded-lg border px-5 py-4',
          failed
            ? 'border-red-200 bg-red-50/70'
            : result.verdict === 'pass'
              ? 'border-emerald-200 bg-emerald-50/70'
              : 'border-amber-200 bg-amber-50/70',
        )}
      >
        {failed ? (
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        ) : result.verdict === 'pass' ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        ) : (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'text-[15px] font-semibold',
                failed ? 'text-red-700' : result.verdict === 'pass' ? 'text-emerald-700' : 'text-amber-700',
              )}
            >
              审核结论：{failed ? '不通过' : result.verdict === 'pass' ? '通过' : '待人工复核'}
            </span>
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-amber-700 ring-1 ring-amber-200">
              缺失 {missCount}
            </span>
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-red-700 ring-1 ring-red-200">
              违规 {vioCount}
            </span>
            {result.partial && loading && (
              <span className="text-xs text-muted-foreground">（结果生成中…）</span>
            )}
          </div>
          {result.summary && (
            <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">
              {result.summary}
            </p>
          )}
        </div>
      </div>

      {/* 缺失清单 */}
      {missCount > 0 && (
        <IssueSection
          title="要求有，但草稿缺失"
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
          accent="amber"
        >
          {result.missing.map((it, i) => (
            <IssueCard key={it.id} index={i + 1} issue={it} accent="amber" />
          ))}
        </IssueSection>
      )}

      {/* 违规清单 */}
      {vioCount > 0 && (
        <IssueSection
          title="不能有，但草稿出现"
          icon={<XCircle className="h-4 w-4 text-red-600" />}
          accent="red"
        >
          {result.violations.map((it, i) => (
            <IssueCard
              key={it.id}
              index={i + 1}
              issue={it}
              accent="red"
              onLocate={() => props.onLocate(it)}
            />
          ))}
        </IssueSection>
      )}

      {/* 无问题 */}
      {!failed && result.verdict === 'pass' && (
        <div className="rounded-lg border border-emerald-200 bg-white px-5 py-6 text-center text-sm text-emerald-700">
          <CheckCircle2 className="mx-auto mb-2 h-6 w-6" />
          草稿已覆盖 Brief 明确要求的必备内容，且未出现 Brief 明确禁止的表述。
          <div className="mt-1 text-xs text-muted-foreground">
            本结论仅基于 Brief 自身的硬性要求，发布前仍建议人工通读。
          </div>
        </div>
      )}

      {/* 软建议 */}
      {result.suggestions.length > 0 && (
        <div className="rounded-lg border border-line bg-white">
          <button
            type="button"
            onClick={props.toggleSuggestions}
            className="flex w-full items-center gap-2 px-5 py-3 text-left text-[13.5px] font-semibold"
          >
            <Lightbulb className="h-4 w-4 text-slate-500" />
            优化建议（非必须，不影响通过）· {result.suggestions.length} 条
            <ArrowRight
              className={cn(
                'ml-auto h-4 w-4 text-muted-foreground transition-transform',
                props.showSuggestions && 'rotate-90',
              )}
            />
          </button>
          {props.showSuggestions && (
            <ul className="space-y-2 border-t border-line px-5 py-3">
              {result.suggestions.map((s, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-slate-600">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function IssueSection(props: {
  title: string;
  icon: React.ReactNode;
  accent: 'amber' | 'red';
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-white">
      <div className="flex items-center gap-2 border-b border-line px-5 py-3 text-[13.5px] font-semibold">
        {props.icon}
        {props.title}
      </div>
      <div className="space-y-3 px-5 py-4">{props.children}</div>
    </div>
  );
}

function IssueCard(props: {
  index: number;
  issue: ReviewIssue;
  accent: 'amber' | 'red';
  onLocate?: () => void;
}) {
  const { issue } = props;
  return (
    <div className="rounded-md border border-line bg-slate-50/50 p-4">
      <div className="flex items-start gap-2">
        <span
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white',
            props.accent === 'red' ? 'bg-red-500' : 'bg-amber-500',
          )}
        >
          {props.index}
        </span>
        <div className="min-w-0 flex-1 space-y-1.5 text-[13px] leading-relaxed">
          {issue.requirement && (
            <p>
              <span className="font-medium text-slate-500">Brief 要求：</span>
              <span className="text-slate-800">{issue.requirement}</span>
            </p>
          )}
          {issue.detail && (
            <p>
              <span className="font-medium text-slate-500">
                {props.accent === 'red' ? '问题：' : '缺失：'}
              </span>
              <span className="text-slate-800">{issue.detail}</span>
            </p>
          )}
          {props.accent === 'red' && issue.quote && (
            <p className="rounded border border-red-100 bg-red-50/60 px-2.5 py-1.5">
              <span className="font-medium text-red-500">草稿原文：</span>
              <span className="text-red-700">“{issue.quote}”</span>
            </p>
          )}
          {issue.suggestion && (
            <p>
              <span className="font-medium text-emerald-600">修改建议：</span>
              <span className="text-slate-700">{issue.suggestion}</span>
            </p>
          )}
        </div>
        {props.accent === 'red' && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 shrink-0 text-xs"
            onClick={props.onLocate}
          >
            <Crosshair className="mr-1 h-3.5 w-3.5" />
            定位草稿
          </Button>
        )}
      </div>
    </div>
  );
}
