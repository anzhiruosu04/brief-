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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAppState } from '@/hooks/useAppState';
import { parseFile } from '@/lib/fileParser';
import { cn } from '@/lib/utils';

interface AttachedFile {
  name: string;
  text: string;
}

const ACCEPT = '.txt,.docx,.pdf';

export function QuickGenerate() {
  const router = useRouter();
  const { createNewBrief } = useAppState();
  const [material, setMaterial] = useState('');
  const [requirement, setRequirement] = useState('');
  const [file, setFile] = useState<AttachedFile | null>(null);
  const [parseError, setParseError] = useState('');
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mergedMaterial = file
    ? file.text
    : material.trim();

  const canSubmit = mergedMaterial.trim().length >= 20 && !parsing;

  const handleFile = async (f: File) => {
    setParseError('');
    setParsing(true);
    try {
      const parsed = await parseFile(f);
      if (!parsed.text.trim()) {
        setParseError('未能从文件中解析出文字，请改用粘贴方式');
      } else {
        setFile({ name: parsed.name, text: parsed.text });
        setMaterial('');
      }
    } catch {
      setParseError('文件解析失败，请确认格式为 docx / pdf / txt');
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
      sourceName: file ? file.name : '首页一键生成',
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
    <section className="rounded-xl border border-line bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles size={17} />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold">粘贴资料，一键生成 Brief</h2>
          <p className="text-xs text-muted-foreground">
            支持粘贴文字或上传 docx / pdf / txt，AI 将直接产出结构化、已过合规审核的 Brief
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {file ? (
          <div className="flex items-center gap-2.5 rounded-lg border border-line bg-slate-50 px-3 py-2.5">
            <FileText size={16} className="shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{file.name}</div>
              <div className="text-[11px] text-muted-foreground">
                已解析 {file.text.length.toLocaleString()} 字，将作为素材
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="rounded p-1 text-muted-foreground hover:bg-slate-200 hover:text-foreground"
              aria-label="移除文件"
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          <Textarea
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            placeholder="把产品资料、公关稿、参数配置或会议纪要粘贴到这里……（建议包含车型定位、核心参数、价格上市、目标人群、卖点等，至少 20 字）"
            className="min-h-[168px] resize-y text-[13.5px] leading-relaxed"
          />
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
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
            上传文件
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
  );
}
