'use client';

import { useRef, useState } from 'react';
import {
  ClipboardPaste,
  FileUp,
  ImageUp,
  Loader2,
  Trash2,
  Copy,
  Download,
  Check,
  ScanText,
  Wand2,
} from 'lucide-react';
import { AppShell, PageHeader } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LevelBadge, OverallRiskTag } from '@/components/risk-badge';
import { HighlightedText } from '@/components/highlighted-text';
import { useAppState } from '@/hooks/useAppState';
import { useScan } from '@/hooks/useCompliance';
import { aggregateHits, replaceAllWord } from '@/lib/scanner';
import { parseFile, fileToDataUri } from '@/lib/fileParser';
import { downloadText } from '@/lib/utils';
import { toast } from 'sonner';
import type { ScanHit } from '@/lib/types';
import { cn } from '@/lib/utils';

type InputTab = 'paste' | 'file' | 'image';

export default function CompliancePage() {
  const { activeLibrary, settings } = useAppState();
  const [text, setText] = useState('');
  const [tab, setTab] = useState<InputTab>('paste');
  const [busy, setBusy] = useState(false);
  const [sourceName, setSourceName] = useState('');
  const [preview, setPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const result = useScan(text, activeLibrary);
  const aggregated = aggregateHits(result);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const parsed = await parseFile(file);
      setText(parsed.text);
      setSourceName(parsed.name);
      setTab('paste');
      setImagePreview(null);
      toast.success(`已解析 ${parsed.name}，共 ${parsed.text.length} 字`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '文件解析失败');
    } finally {
      setBusy(false);
    }
  };

  const handleImage = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const dataUri = await fileToDataUri(file);
      setImagePreview(dataUri);
      const resp = await fetch('/api/ai/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: dataUri,
          model: settings.aiModel,
          prompt:
            '请识别图片中的全部中文文字内容，保持原有段落顺序，仅输出识别到的文字本身，不要添加解释。',
        }),
      });
      const data = (await resp.json()) as { text?: string; error?: string };
      if (!resp.ok || !data.text) throw new Error(data.error ?? 'OCR 识别失败');
      setText(data.text);
      setSourceName(file.name);
      setTab('paste');
      toast.success('图片文字识别完成');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '图片 OCR 失败');
    } finally {
      setBusy(false);
    }
  };

  const replaceOne = (hit: ScanHit) => {
    // 单处替换：仅替换 start/end 区间
    setText(text.slice(0, hit.start) + hit.suggestion + text.slice(hit.end));
  };

  const replaceWordEverywhere = (word: string, suggestion: string) => {
    setText(replaceAllWord(text, word, suggestion));
    toast.success(`已将「${word}」全部替换为「${suggestion}」`);
  };

  const aiPolish = async () => {
    if (!text.trim() || result.total === 0) return;
    setPolishing(true);
    try {
      const resp = await fetch('/api/ai/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          items: aggregated.map((a) => ({
            word: a.word,
            suggestion: a.suggestion,
          })),
          model: settings.aiModel,
        }),
      });
      const data = (await resp.json()) as { text?: string; error?: string };
      if (!resp.ok || !data.text) throw new Error(data.error ?? 'AI 改写失败');
      setText(data.text);
      toast.success('AI 已完成合规改写，请人工复核');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI 改写失败');
    } finally {
      setPolishing(false);
    }
  };

  const copyClean = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('复制失败，请手动选择文本复制');
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="文案合规检测"
        description="独立于 Brief 的单篇文案检测：粘贴文本、上传文件或识别图片，实时扫描广告违禁词"
        actions={
          text ? (
            <>
              <Button variant="outline" size="sm" onClick={copyClean}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? '已复制' : '复制文本'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadText(
                    `合规检测_${sourceName || '文案'}.txt`,
                    text,
                  )
                }
              >
                <Download size={14} />
                导出 TXT
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setText('');
                  setSourceName('');
                  setImagePreview(null);
                }}
              >
                <Trash2 size={14} />
                清空
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_340px]">
        {/* 左：输入与高亮 */}
        <div className="flex min-h-0 flex-col border-r border-line">
          {/* 输入方式切换 */}
          <div className="flex shrink-0 items-center gap-1 border-b border-line bg-white px-4 py-2">
            <TabButton
              active={tab === 'paste'}
              icon={<ClipboardPaste size={14} />}
              label="粘贴文本"
              onClick={() => setTab('paste')}
            />
            <TabButton
              active={tab === 'file'}
              icon={<FileUp size={14} />}
              label="文件上传"
              onClick={() => fileRef.current?.click()}
            />
            <TabButton
              active={tab === 'image'}
              icon={<ImageUp size={14} />}
              label="图片 OCR"
              onClick={() => imageRef.current?.click()}
            />
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.csv,.docx,.pdf"
              className="hidden"
              onChange={(e) => {
                void handleFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <input
              ref={imageRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void handleImage(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            {sourceName && (
              <span className="ml-2 truncate text-xs text-muted-foreground">
                来源：{sourceName}
              </span>
            )}
            {busy && (
              <span className="ml-auto flex items-center gap-1.5 text-xs text-primary">
                <Loader2 size={13} className="animate-spin" />
                {tab === 'image' ? '正在识别图片文字…' : '正在解析文件…'}
              </span>
            )}
            {text && (
              <button
                type="button"
                onClick={() => setPreview((v) => !v)}
                className="ml-auto text-xs font-medium text-primary hover:underline"
              >
                {preview ? '返回编辑' : '预览高亮'}
              </button>
            )}
          </div>

          {/* 文本区 */}
          <div className="thin-scroll min-h-0 flex-1 overflow-y-auto bg-white">
            {text ? (
              preview ? (
                <div className="mx-auto max-w-3xl px-8 py-6">
                  <HighlightedText
                    text={text}
                    hits={result.hits}
                    onHitClick={replaceOne}
                    className="text-[14px] leading-[2] text-slate-800"
                  />
                  <p className="mt-6 border-t border-dashed border-line pt-3 text-xs text-muted-foreground">
                    点击高亮词可用建议表述替换该处；如需批量替换，请在右侧风险列表操作。
                  </p>
                </div>
              ) : (
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="在此粘贴待检测的文案，如新闻稿、海报文案、短视频脚本、直播口播稿…输入即实时扫描，无需点击按钮。"
                  className="min-h-full resize-none rounded-none border-0 px-8 py-6 text-[14px] leading-[2] focus-visible:ring-0"
                />
              )
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/8">
                  <ScanText size={26} className="text-primary" />
                </div>
                <p className="text-sm font-medium">粘贴或上传待检测文案</p>
                <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                  支持直接粘贴文本、上传 DOCX / PDF / TXT 文件，或上传图片通过多模态
                  AI 识别文字。检测基于内置 564 条违禁词库与你的自定义词条，输入即时出结果。
                </p>
              </div>
            )}
          </div>

          {imagePreview && (
            <div className="shrink-0 border-t border-line bg-slate-50 p-3">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="OCR 原图"
                  className="h-16 rounded border border-line object-cover"
                />
                <span className="text-xs text-muted-foreground">
                  OCR 原图缩略图，识别结果已填入编辑区
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 右：风险面板 */}
        <aside className="thin-scroll flex min-h-0 flex-col overflow-y-auto bg-page-bg">
          <div className="space-y-3 p-4">
            <div className="rounded-xl border border-line bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-semibold">检测结果</span>
                <OverallRiskTag
                  result={{
                    total: result.total,
                    highCount: result.highCount,
                    mediumCount: result.mediumCount,
                    lowCount: result.lowCount,
                  }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat label="高风险" value={result.highCount} tone="text-red-600" />
                <Stat
                  label="中风险"
                  value={result.mediumCount}
                  tone="text-amber-600"
                />
                <Stat label="低风险" value={result.lowCount} tone="text-sky-600" />
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                扫描 {activeLibrary.length} 条生效词条；检测结果仅供参考，发布前请以法务终审意见为准。
              </p>
              {result.total > 0 && (
                <Button
                  size="sm"
                  className="mt-3 w-full"
                  disabled={polishing}
                  onClick={() => void aiPolish()}
                >
                  {polishing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Wand2 size={14} />
                  )}
                  AI 一键合规改写
                </Button>
              )}
            </div>

            {aggregated.length > 0 ? (
              <div className="space-y-2">
                <p className="px-1 text-xs font-medium text-muted-foreground">
                  风险词条（{aggregated.length} 类 / {result.total} 处）
                </p>
                {aggregated.map((agg) => (
                  <div
                    key={agg.word}
                    className="rounded-xl border border-line bg-white p-3"
                  >
                    <div className="flex items-center gap-2">
                      <LevelBadge level={agg.level} size="xs" />
                      <span className="text-sm font-semibold">
                        「{agg.word}」
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        ×{agg.count}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                      {agg.reason}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">建议</span>
                      <span className="font-medium text-emerald-700">
                        {agg.suggestion}
                      </span>
                    </div>
                    <div className="mt-2.5 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 flex-1 text-xs"
                        onClick={() =>
                          replaceWordEverywhere(agg.word, agg.suggestion)
                        }
                      >
                        全部替换为建议
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              text && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-center">
                  <Check size={22} className="mx-auto text-emerald-600" />
                  <p className="mt-1.5 text-sm font-medium text-emerald-700">
                    未发现风险表述
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-600/80">
                    当前文案未命中生效词库中的词条
                  </p>
                </div>
              )
            )}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] transition-colors',
        active
          ? 'bg-primary/8 font-medium text-primary'
          : 'text-slate-600 hover:bg-slate-100',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 py-2">
      <div className={cn('text-lg font-semibold leading-none', tone)}>
        {value}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
