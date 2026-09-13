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
  Wand2,
} from 'lucide-react';
import { AppShell, PageHeader } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LevelBadge, OverallRiskTag } from '@/components/risk-badge';
import { HighlightedText } from '@/components/highlighted-text';
import { DropZone } from '@/components/material/drop-zone';
import { useAppState } from '@/hooks/useAppState';
import { useScan } from '@/hooks/useCompliance';
import { aggregateHits, replaceAllWord } from '@/lib/scanner';
import { importMaterial, type ImportedMaterial } from '@/lib/fileParser';
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

  const applyImport = (m: ImportedMaterial) => {
    setText(m.text);
    setSourceName(m.name);
    setImagePreview(m.preview ?? null);
    setTab('paste');
  };

  const handlePickerFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const m = await importMaterial(file, { ocrModel: settings.aiModel });
      applyImport(m);
      if (m.kind === 'image') toast.success('图片文字识别完成');
      else toast.success(`已解析 ${m.name}，共 ${m.text.length} 字`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '素材导入失败');
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
        {/* 左：输入与高亮（整区可拖入图片/文档、可粘贴截图） */}
        <DropZone
          onImport={applyImport}
          ocrModel={settings.aiModel}
          fill={false}
          className="flex min-h-0 flex-col border-r border-line"
        >
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
                void handlePickerFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <input
              ref={imageRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void handlePickerFile(e.target.files?.[0]);
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

          {/* 文本区：始终可输入，进入页面即可直接粘贴（Cmd/Ctrl+V） */}
          <div className="thin-scroll min-h-0 flex-1 overflow-y-auto bg-white">
            {preview && text ? (
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
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={'在此点击后，直接粘贴（Cmd/Ctrl + V）从微信、飞书等复制的文案。\n\n也可切换上方「文件上传」「图片 OCR」，或把文件 / 截图直接拖进本区域。\n\n支持新闻稿、海报文案、短视频脚本、直播口播稿等；输入即实时扫描，无需点击按钮。'}
                className="min-h-full resize-none rounded-none border-0 px-8 py-6 text-[14px] leading-[2] focus-visible:ring-0"
              />
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
        </DropZone>

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
