'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardPaste,
  FileUp,
  Link2,
  Loader2,
  X,
  FileText,
  Sparkles,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useAppState } from '@/hooks/useAppState';
import { parseFile } from '@/lib/fileParser';
import { cn } from '@/lib/utils';
import { GenStatus } from '@/hooks/useBriefAI';

export interface MaterialState {
  text: string;
  name: string;
  requirement: string;
}

const ACCEPT = '.txt,.md,.csv,.docx,.pdf';

export function MaterialPanel({
  material,
  onChange,
  onGenerate,
  genStatus,
}: {
  material: MaterialState;
  onChange: (next: MaterialState) => void;
  onGenerate: () => void;
  genStatus: GenStatus;
}) {
  const { settings } = useAppState();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [feishuUrl, setFeishuUrl] = useState('');
  const [feishuLoading, setFeishuLoading] = useState(false);
  const [feishuError, setFeishuError] = useState<string | null>(null);

  const feishuReady =
    settings.feishuAppId.trim() !== '' && settings.feishuAppSecret.trim() !== '';

  const setText = (text: string, name = material.name) =>
    onChange({ ...material, text, name });

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setParsing(true);
    setParseError(null);
    try {
      const parsed = await parseFile(files[0]);
      setText(parsed.text, parsed.name);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : '文件解析失败');
    } finally {
      setParsing(false);
    }
  };

  const handleFeishuRead = async () => {
    if (!feishuUrl.trim()) return;
    setFeishuLoading(true);
    setFeishuError(null);
    try {
      const resp = await fetch('/api/feishu/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: feishuUrl.trim(),
          appId: settings.feishuAppId,
          appSecret: settings.feishuAppSecret,
        }),
      });
      const data = (await resp.json()) as { text?: string; error?: string };
      if (!resp.ok || !data.text) {
        throw new Error(data.error ?? '读取失败');
      }
      setText(data.text, '飞书文档');
    } catch (err) {
      setFeishuError(err instanceof Error ? err.message : '飞书读取失败');
    } finally {
      setFeishuLoading(false);
    }
  };

  const generating = genStatus === 'thinking' || genStatus === 'writing';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto thin-scroll">
        <Tabs defaultValue="paste" className="w-full">
          <TabsList className="mx-5 mt-4 grid w-[calc(100%-2.5rem)] grid-cols-3">
            <TabsTrigger value="paste" className="gap-1 text-xs">
              <ClipboardPaste size={13} /> 粘贴文本
            </TabsTrigger>
            <TabsTrigger value="file" className="gap-1 text-xs">
              <FileUp size={13} /> 文件上传
            </TabsTrigger>
            <TabsTrigger value="feishu" className="gap-1 text-xs">
              <Link2 size={13} /> 飞书文档
            </TabsTrigger>
          </TabsList>

          <TabsContent value="paste" className="mt-3 px-5">
            <Textarea
              value={material.text}
              onChange={(e) => setText(e.target.value, '')}
              placeholder="粘贴产品资料、发布会通稿、车型配置表、会议纪要等任意素材文本，AI 将据此生成结构化 Brief…"
              className="min-h-[220px] resize-none text-[13px] leading-relaxed"
            />
          </TabsContent>

          <TabsContent value="file" className="mt-3 px-5">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void handleFiles(e.dataTransfer.files);
              }}
              className={cn(
                'flex min-h-[220px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed transition-colors',
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-line bg-slate-50/60 hover:border-primary/50',
              )}
            >
              {parsing ? (
                <>
                  <Loader2 size={26} className="animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">
                    正在解析文件…
                  </span>
                </>
              ) : (
                <>
                  <FileUp size={26} className="text-slate-400" />
                  <span className="text-sm font-medium">
                    点击选择或拖拽文件到此处
                  </span>
                  <span className="text-xs text-muted-foreground">
                    支持 DOCX / PDF / TXT，单文件最多提取 20 万字符
                  </span>
                </>
              )}
            </button>
            {parseError && (
              <p className="mt-2 text-xs text-red-600">{parseError}</p>
            )}
            {material.name && (
              <div className="mt-2 flex items-center gap-2 rounded-md bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                <FileText size={13} />
                <span className="truncate">已载入：{material.name}</span>
                <button
                  type="button"
                  onClick={() => setText('', '')}
                  className="ml-auto text-slate-400 hover:text-red-500"
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="feishu" className="mt-3 px-5">
            {!feishuReady ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line bg-slate-50/60 px-6 text-center">
                <Info size={24} className="text-slate-400" />
                <div className="text-sm font-medium">尚未配置飞书应用凭证</div>
                <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                  飞书读取通过服务端代理调用，凭证仅保存在你的浏览器本地。
                  请先在设置页填写自建应用的 App ID 与 App Secret，并为应用开通云文档读取权限。
                </p>
                <Link
                  href="/settings"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  前往设置 →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={feishuUrl}
                    onChange={(e) => setFeishuUrl(e.target.value)}
                    placeholder="粘贴飞书云文档链接（docx / docs / wiki / sheets）"
                    className="h-9 text-[13px]"
                  />
                  <Button
                    onClick={handleFeishuRead}
                    disabled={feishuLoading || !feishuUrl.trim()}
                    size="sm"
                    className="shrink-0"
                  >
                    {feishuLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Link2 size={14} />
                    )}
                    读取
                  </Button>
                </div>
                {feishuError && (
                  <p className="text-xs text-red-600">{feishuError}</p>
                )}
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  支持新版文档、知识库文档与电子表格；旧版 doc 文档可能无法读取。
                </p>
                {material.name === '飞书文档' && (
                  <div className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                    <FileText size={13} />
                    <span>已从飞书文档载入 {material.text.length} 字</span>
                    <button
                      type="button"
                      onClick={() => setText('', '')}
                      className="ml-auto text-slate-400 hover:text-red-500"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* 素材预览（非粘贴 tab 时展示） */}
        {material.text && (
          <div className="px-5 pb-4 pt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                素材文本预览
              </span>
              <span className="text-[11px] text-muted-foreground">
                {material.text.length} 字
              </span>
            </div>
            <div className="thin-scroll max-h-44 overflow-y-auto whitespace-pre-wrap rounded-md border border-line bg-white p-3 text-xs leading-relaxed text-slate-600">
              {material.text.slice(0, 4000)}
              {material.text.length > 4000 ? '\n…（内容较长，已截断预览）' : ''}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-line bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            补充要求（可选）
          </label>
          <Input
            value={material.requirement}
            onChange={(e) =>
              onChange({ ...material, requirement: e.target.value })
            }
            placeholder="如：面向 25-35 岁家庭用户，强调安全与空间，语气专业克制"
            className="h-9 text-[13px]"
          />
        </div>
        <Button
          onClick={onGenerate}
          disabled={!material.text.trim() || generating}
          className="w-full"
        >
          {generating ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              {genStatus === 'thinking' ? 'AI 正在分析素材…' : 'AI 正在撰写…'}
            </>
          ) : (
            <>
              <Sparkles size={15} />
              生成结构化 Brief
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
