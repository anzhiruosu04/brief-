'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Download,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  PanelLeftOpen,
  AlertTriangle,
  Eye,
  PencilLine,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BriefListPane } from './brief-list-pane';
import { MaterialPanel, type MaterialState } from './material-panel';
import { ModuleCard } from './module-card';
import { BriefPreview } from './brief-preview';
import { OverallRiskTag, LevelBadge } from '@/components/risk-badge';
import { useAppState } from '@/hooks/useAppState';
import { useBriefAI } from '@/hooks/useBriefAI';
import { useModuleScan } from '@/hooks/useCompliance';
import { aggregateHits, topLevel } from '@/lib/scanner';
import { exportBriefToDocx } from '@/lib/docxExport';
import { uid } from '@/lib/storage';
import { createModule } from '@/lib/defaults';
import { toast } from 'sonner';
import {
  type Brief,
  type BriefModule,
  type BriefModuleKey,
} from '@/lib/types';
import { getTemplate } from '@/lib/templates';
import { cn } from '@/lib/utils';

export function BriefEditor({ briefId }: { briefId: string }) {
  const { ready, getBrief, updateBrief, activeLibrary, settings } =
    useAppState();
  const brief = getBrief(briefId);

  const materialRef = useRef<MaterialState>({
    text: brief?.sourceText ?? '',
    name: brief?.sourceName ?? '',
    requirement: '',
  });
  const [material, setMaterial] = useState<MaterialState>(materialRef.current);
  const [generating, setGenerating] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const ai = useBriefAI();

  // 首页「一键生成」：读取一次性自动生成指令并立即执行，完成后进入成品预览
  const autogenRef = useRef(false);
  useEffect(() => {
    if (!ready || !brief || autogenRef.current) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autogen') !== '1') return;
    autogenRef.current = true;
    window.history.replaceState({}, '', `/briefs/${brief.id}`);
    const key = `autogen:${brief.id}`;
    let requirement = '';
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) requirement = (JSON.parse(raw) as { requirement?: string }).requirement ?? '';
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    const src = brief.sourceText ?? '';
    if (!src.trim()) return;
    setMaterial({ text: src, name: brief.sourceName ?? '', requirement });
    setView('preview');
    void (async () => {
      setGenerating(true);
      const res = await ai.generate({
        material: src,
        requirement,
        model: settings.aiModel,
        template: brief.template ?? 'koc',
        onTitle: (title) => updateBrief(brief.id, { title }),
        onModulesChange: (nextModules) => {
          updateBrief(brief.id, { modules: nextModules });
        },
      });
      setGenerating(false);
      if (!res.ok) {
        setView('edit');
        toast.error(res.error);
      } else if (!res.aborted) {
        toast.success('Brief 已生成，可直接查看成品或导出 Word');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, brief]);

  // 模块内容（受控本地态，编辑即时写回 store）
  const modules = brief?.modules ?? [];
  const modulePayload = useMemo(
    () => modules.map((m) => ({ id: m.id, key: m.key, kind: m.kind, content: m.content })),
    [modules],
  );
  const { byModule, result } = useModuleScan(modulePayload, activeLibrary);

  // 扫描结果回写到 brief（节流：按结果引用变化）
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!brief) return;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      const level = topLevel(result);
      updateBrief(brief.id, {
        issueCount: result.total,
        highCount: result.highCount,
        mediumCount: result.mediumCount,
        lowCount: result.lowCount,
        riskLevel: level,
      });
    }, 400);
    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  if (ready && !brief) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <AlertTriangle size={28} />
        <p className="text-sm">Brief 不存在或已被删除</p>
        <Link
          href="/briefs"
          className="text-sm font-medium text-primary hover:underline"
        >
          返回列表
        </Link>
      </div>
    );
  }
  if (!brief) return null;

  const patchModule = (id: string, patch: Partial<BriefModule>) => {
    updateBrief(brief.id, {
      modules: brief.modules.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    });
  };

  const addModule = (key: BriefModuleKey) => {
    if (key !== 'custom') {
      const exists = brief.modules.some((m) => m.key === key);
      if (exists) {
        toast.info('该模块已存在');
        return;
      }
    }
    const mod = createModule(key);
    if (key === 'custom') {
      mod.title = '附加模块';
      mod.enTitle = 'Appendix';
    }
    updateBrief(brief.id, { modules: [...brief.modules, mod] });
    setAddOpen(false);
  };

  const deleteModule = (id: string) => {
    updateBrief(brief.id, {
      modules: brief.modules.filter((m) => m.id !== id),
    });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    updateBrief(brief.id, {
      sourceText: material.text,
      sourceName: material.name || '手动粘贴',
    });
    const res = await ai.generate({
      material: material.text,
      requirement: material.requirement,
      model: settings.aiModel,
      template: brief.template ?? 'koc',
      onTitle: (title) => updateBrief(brief.id, { title }),
      onModulesChange: (nextModules) => {
        updateBrief(brief.id, { modules: nextModules });
      },
    });
    setGenerating(false);
    if (!res.ok) {
      toast.error(res.error);
    } else if (!res.aborted) {
      toast.success('Brief 已生成，请逐模块核对并修改');
    }
  };

  const handleExport = async () => {
    try {
      await exportBriefToDocx(brief);
      toast.success('Word 文档已开始下载');
    } catch {
      toast.error('导出失败，请重试');
    }
  };

  const handleSaveMaterial = () => {
    updateBrief(brief.id, {
      sourceText: material.text,
      sourceName: material.name || '手动粘贴',
    });
    toast.success('素材已保存到 Brief');
  };

  const aggregated = aggregateHits(result);
  const isGenActive =
    ai.state.status === 'thinking' || ai.state.status === 'writing';

  const availableMeta = getTemplate(brief.template ?? 'general').modules.filter(
    (meta) => !brief.modules.some((m) => m.key === meta.key),
  );

  return (
    <div className="flex h-full min-h-0">
      {/* 左侧：Brief 列表（桌面常驻宽屏，窄屏用抽屉） */}
      <div className="hidden w-64 shrink-0 border-r border-line lg:block">
        <BriefListPane />
      </div>

      {/* 中间：素材输入（仅编辑视图显示） */}
      {view === 'edit' && (
        <div className="hidden w-[380px] shrink-0 flex-col border-r border-line xl:flex">
          <MaterialPanel
            material={material}
            onChange={setMaterial}
            onGenerate={() => void handleGenerate()}
            genStatus={ai.state.status}
          />
        </div>
      )}

      {/* 右侧：模块化编辑器 / 成品预览 */}
      <div className="relative flex min-w-0 flex-1 flex-col bg-page-bg">
        {/* 编辑器顶栏 */}
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-white px-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                title="Brief 列表"
              >
                <PanelLeftOpen size={17} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="h-14 border-b">
                <SheetTitle className="text-sm">Brief 列表</SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100%-3.5rem)]">
                <BriefListPane compact />
              </div>
            </SheetContent>
          </Sheet>

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn('xl:hidden', view !== 'edit' && 'hidden')}
                title="素材输入"
              >
                <Sparkles size={17} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full p-0 sm:max-w-md">
              <SheetHeader className="h-14 border-b">
                <SheetTitle className="text-sm">素材输入与 AI 生成</SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100%-3.5rem)]">
                <MaterialPanel
                  material={material}
                  onChange={setMaterial}
                  onGenerate={() => void handleGenerate()}
                  genStatus={ai.state.status}
                />
              </div>
            </SheetContent>
          </Sheet>

          <Input
            value={brief.title}
            onChange={(e) => updateBrief(brief.id, { title: e.target.value })}
            className="h-8 max-w-xs border-transparent bg-transparent text-[15px] font-semibold hover:border-line focus:border-primary"
          />
          <Input
            value={brief.project}
            onChange={(e) => updateBrief(brief.id, { project: e.target.value })}
            placeholder="关联项目 / 车型"
            className="h-8 w-40 border-transparent bg-transparent text-xs text-muted-foreground hover:border-line focus:border-primary"
          />

          <div className="ml-auto flex items-center gap-2">
            <OverallRiskTag
              result={{
                total: result.total,
                highCount: result.highCount,
                mediumCount: result.mediumCount,
                lowCount: result.lowCount,
              }}
            />
            <div className="flex items-center rounded-md border border-line p-0.5">
              <button
                type="button"
                onClick={() => setView('edit')}
                className={cn(
                  'flex items-center gap-1 rounded px-2.5 py-1 text-xs transition-colors',
                  view === 'edit'
                    ? 'bg-slate-100 font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <PencilLine size={13} />
                编辑
              </button>
              <button
                type="button"
                onClick={() => setView('preview')}
                className={cn(
                  'flex items-center gap-1 rounded px-2.5 py-1 text-xs transition-colors',
                  view === 'preview'
                    ? 'bg-slate-100 font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Eye size={13} />
                成品预览
              </button>
            </div>
            {view === 'edit' && (
              <Button variant="outline" size="sm" onClick={handleSaveMaterial}>
                <Save size={14} />
                保存素材
              </Button>
            )}
            <Button size="sm" onClick={() => void handleExport()}>
              <Download size={14} />
              导出 Word
            </Button>
          </div>
        </div>

        {view === 'preview' ? (
          <BriefPreview brief={brief} result={result} generating={isGenActive} />
        ) : (
          <>
        {/* 扫描概览条 */}
        <div className="flex shrink-0 items-center gap-3 border-b border-line bg-white px-5 py-2 text-xs">
          <ShieldCheck size={14} className="text-primary" />
          {result.total === 0 ? (
            <span className="text-slate-600">
              实时合规扫描：当前未发现风险表述
            </span>
          ) : (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium text-slate-700">
                实时合规扫描发现 {result.total} 处风险
              </span>
              <span className="flex items-center gap-1">
                <LevelBadge level="high" size="xs" /> {result.highCount}
              </span>
              <span className="flex items-center gap-1">
                <LevelBadge level="medium" size="xs" /> {result.mediumCount}
              </span>
              <span className="flex items-center gap-1">
                <LevelBadge level="low" size="xs" /> {result.lowCount}
              </span>
            </span>
          )}
          <span className="ml-auto text-[11px] text-muted-foreground">
            生效词库 {activeLibrary.length} 条
          </span>
        </div>

        {/* 模块流 */}
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-4 px-5 py-5">
            {isGenActive && modules.length === 0 && (
              <ThinkingSkeleton />
            )}
            {brief.modules.map((mod) => (
              <ModuleCard
                key={mod.id}
                module={mod}
                scanResult={
                  byModule.get(mod.id) ?? {
                    hits: [],
                    highCount: 0,
                    mediumCount: 0,
                    lowCount: 0,
                    total: 0,
                  }
                }
                generating={isGenActive}
                canDelete
                onChange={(patch) => patchModule(mod.id, patch)}
                onDelete={() => deleteModule(mod.id)}
              />
            ))}

            {/* 添加模块 */}
            <div className="flex items-center gap-2 pb-8 pt-1">
              <Select
                open={addOpen}
                onOpenChange={setAddOpen}
                onValueChange={(v) => addModule(v as BriefModuleKey)}
              >
                <SelectTrigger className="h-9 w-44 text-xs">
                  <Plus size={13} />
                  <SelectValue placeholder="添加标准模块" />
                </SelectTrigger>
                <SelectContent>
                  {availableMeta.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      标准模块已全部添加
                    </SelectItem>
                  ) : (
                    availableMeta.map((meta) => (
                      <SelectItem key={meta.key} value={meta.key}>
                        {meta.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs"
                onClick={() => addModule('custom')}
              >
                <Plus size={13} />
                自定义模块
              </Button>
            </div>
          </div>
        </div>
          </>
        )}

        {/* AI 生成中浮动状态 */}
        {isGenActive && (
          <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
            <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-primary/20 bg-white px-4 py-2 text-xs font-medium text-primary shadow-lg">
              <Loader2 size={14} className="animate-spin" />
              {ai.state.status === 'thinking'
                ? 'AI 正在分析素材并规划结构…'
                : 'AI 正在逐模块撰写 Brief…'}
              <button
                type="button"
                className="ml-2 text-slate-400 hover:text-red-500"
                onClick={() => ai.stop()}
              >
                停止
              </button>
            </div>
          </div>
        )}

        {/* 风险词汇总（仅编辑视图显示） */}
        {view === 'edit' && result.total > 0 && (
          <RiskSummary brief={brief} aggregated={aggregated} />
        )}
      </div>
    </div>
  );
}

function ThinkingSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="skeleton-breathe rounded-xl border border-line bg-white p-4"
        >
          <div className="mb-3 h-4 w-28 rounded bg-slate-200" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-11/12 rounded bg-slate-100" />
            <div className="h-3 w-4/5 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function RiskSummary({
  brief,
  aggregated,
}: {
  brief: Brief;
  aggregated: ReturnType<typeof aggregateHits>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="pointer-events-none absolute bottom-6 right-6 z-20 w-80">
      <div
        className={cn(
          'pointer-events-auto overflow-hidden rounded-xl border bg-white shadow-lg transition-all',
          open ? 'max-h-[70vh]' : 'max-h-12',
          aggregated.some((a) => a.level === 'high')
            ? 'border-red-200'
            : 'border-amber-200',
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-12 w-full items-center gap-2 px-4 text-xs font-medium"
        >
          <ShieldCheck size={15} className="text-primary" />
          待处理风险词 {aggregated.length} 类
          <span className="ml-auto text-muted-foreground">
            {open ? '收起' : '展开'}
          </span>
        </button>
        {open && (
          <div className="thin-scroll max-h-[calc(70vh-3rem)] space-y-2 overflow-y-auto border-t border-line px-4 py-3">
            {aggregated.map((agg) => (
              <div key={agg.word} className="text-xs leading-relaxed">
                <div className="flex items-center gap-2">
                  <LevelBadge level={agg.level} size="xs" />
                  <span className="font-medium">{agg.word}</span>
                  <span className="text-muted-foreground">×{agg.count}</span>
                </div>
                <p className="mt-0.5 pl-1 text-[11px] text-muted-foreground">
                  {agg.reason}
                </p>
                <p className="pl-1 text-[11px] text-emerald-700">
                  建议：{agg.suggestion}
                </p>
              </div>
            ))}
            <p className="pt-1 text-[11px] text-muted-foreground">
              「{brief.title}」共 {brief.modules.length} 个模块参与扫描
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
