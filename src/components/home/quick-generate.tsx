'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  FileUp,
  Loader2,
  X,
  FileText,
  ArrowRight,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DropZone } from '@/components/material/drop-zone';
import { useAppState } from '@/hooks/useAppState';
import { importMaterial } from '@/lib/fileParser';
import type { ImportedMaterial } from '@/lib/fileParser';
import { cn } from '@/lib/utils';
import { KOC_TEMPLATE, JOEY_TEMPLATE } from '@/lib/templates';
import type { BriefTemplateId } from '@/lib/types';

type AttachedMaterial = ImportedMaterial;

const ACCEPT = '.txt,.md,.csv,.docx,.pdf,image/*';

const FORMAT_OPTIONS: { id: BriefTemplateId; name: string; desc: string }[] = [
  { id: 'koc', name: '默认格式', desc: KOC_TEMPLATE.description },
  { id: 'joey', name: 'Joey Brief', desc: JOEY_TEMPLATE.description },
];

export function QuickGenerate() {
  const router = useRouter();
  const { createNewBrief, settings } = useAppState();
  const [material, setMaterial] = useState('');
  const [requirement, setRequirement] = useState('');
  const [attached, setAttached] = useState<AttachedMaterial | null>(null);
  const [format, setFormat] = useState<BriefTemplateId>('koc');
  const [parseError, setParseError] = useState('');
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mergedMaterial = attached ? attached.text : material.trim();
  const canSubmit = mergedMaterial.trim().length >= 20 && !parsing;

  const applyImport = (m: ImportedMaterial) => {
    setParseError('');
    setAttached(m);
    setMaterial('');
  };

  const handlePickerFile = async (f: File) => {
    setParseError('');
    setParsing(true);
    try {
      // 选择器允许图片与文档，统一走 importMaterial（图片走 OCR）
      const m = await importMaterial(f, { ocrModel: settings.aiModel });
      applyImport(m);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : '文件解析失败');
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    const text = mergedMaterial.trim();
    if (text.length < 20) return;
    const brief = createNewBrief({
      sourceText: text,
      sourceName: attached ? attached.name : '首页一键生成',
      template: format,
    });
    // 通过 sessionStorage 传递一次性自动生成指令，避免污染 URL 与刷新重跑
    try {
      sessionStorage.setItem(
        `autogen:${brief.id}`,
        JSON.stringify({ requirement: requirement.trim() }),
      );
    } catch {
      /* sessionStorage 不可用时静默降级为手动生成 */
    }
    router.push(`/briefs/${brief.id}?autogen=1`);
  };

  return (
    <DropZone onImport={applyImport} ocrModel={settings.aiModel} className="rounded-xl">
      <section className="rounded-xl border border-line bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles size={17} />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold">粘贴资料，一键生成 Brief</h2>
            <p className="text-xs text-muted-foreground">
              粘贴文字，或直接把微信 / 飞书里的截图、图片、文档拖进来（也可 Ctrl+V 粘贴截图）
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {attached ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 rounded-lg border border-line bg-slate-50 px-3 py-2.5">
                {attached.kind === 'image' ? (
                  <ImageIcon size={16} className="shrink-0 text-primary" />
                ) : (
                  <FileText size={16} className="shrink-0 text-primary" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">
                    {attached.name}
                    <span className="ml-1.5 rounded bg-primary/10 px-1.5 py-px text-[10px] font-normal text-primary">
                      {attached.kind === 'image' ? '图片识别' : '文档解析'}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    已提取 {attached.text.length.toLocaleString()} 字，将作为素材
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttached(null)}
                  className="rounded p-1 text-muted-foreground hover:bg-slate-200 hover:text-foreground"
                  aria-label="移除素材"
                >
                  <X size={15} />
                </button>
              </div>
              {attached.preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={attached.preview}
                  alt="导入图片预览"
                  className="h-24 rounded-md border border-line object-cover"
                />
              )}
            </div>
          ) : (
            <Textarea
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              placeholder="把产品资料、公关稿、参数配置或会议纪要粘贴到这里；也可直接拖入 / 粘贴截图、DOCX、PDF……（建议包含车型定位、核心参数、价格上市、目标人群、卖点等，至少 20 字）"
              className="min-h-[168px] resize-y text-[13.5px] leading-relaxed"
            />
          )}

          <div>
            <div className="mb-1.5 text-[12px] font-medium text-muted-foreground">输出格式</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {FORMAT_OPTIONS.map((opt) => {
                const active = format === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormat(opt.id)}
                    aria-pressed={active}
                    className={cn(
                      'rounded-lg border p-2.5 text-left transition-colors',
                      active
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-line bg-white hover:border-primary/40 hover:bg-slate-50',
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'flex h-3.5 w-3.5 items-center justify-center rounded-full border',
                          active ? 'border-primary' : 'border-[#C9CDD4]',
                        )}
                      >
                        {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </span>
                      <span className={cn('text-[13px] font-medium', active ? 'text-primary' : 'text-foreground')}>
                        {opt.name}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 pl-5 text-[11px] leading-snug text-muted-foreground">
                      {opt.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handlePickerFile(f);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={parsing}
              onClick={() => fileInputRef.current?.click()}
            >
              {parsing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FileUp size={14} />
              )}
              上传图片 / 文档
            </Button>

            <input
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder="可选：补充要求，如「强调家庭安全与空间，语气专业」"
              className="h-8 min-w-0 flex-1 rounded-md border border-line bg-white px-3 text-[13px] outline-none transition-colors placeholder:text-placeholder focus:border-primary"
            />

            <Button
              type="button"
              size="sm"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="h-8"
            >
              <Sparkles size={14} />
              一键生成
              <ArrowRight size={14} />
            </Button>
          </div>

          <div
            className={cn(
              'flex items-center justify-between text-[11.5px]',
              parseError ? 'text-risk-high' : 'text-muted-foreground',
            )}
          >
            <span>
              {parseError ||
                `当前素材 ${mergedMaterial.trim().length.toLocaleString()} 字 · 生成后自动进入成品预览，可再编辑或导出 Word`}
            </span>
          </div>
        </div>
      </section>
    </DropZone>
  );
}
