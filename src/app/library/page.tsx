'use client';

import { useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Download,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  Pencil,
  EyeOff,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { AppShell, PageHeader } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LevelBadge } from '@/components/risk-badge';
import { WordEditDialog, type WordDraft } from '@/components/library/word-edit-dialog';
import { useAppState } from '@/hooks/useAppState';
import { BUILTIN_WORDS, CATEGORIES } from '@/lib/data/forbiddenWords';
import { downloadText } from '@/lib/utils';
import { toast } from 'sonner';
import type {
  ForbiddenWord,
  RiskLevel,
  WordScope,
} from '@/lib/types';
import { cn } from '@/lib/utils';

interface RowView {
  word: ForbiddenWord;
  hidden: boolean;
  custom: boolean;
}

export default function LibraryPage() {
  const {
    customWords,
    hiddenBuiltin,
    addCustomWord,
    updateCustomWord,
    deleteCustomWord,
    toggleBuiltinWord,
    resetLibrary,
    importWords,
  } = useAppState();

  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('all');
  const [level, setLevel] = useState<'all' | RiskLevel>('all');
  const [scope, setScope] = useState<'all' | WordScope>('all');
  const [source, setSource] = useState<'all' | 'builtin' | 'custom'>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ForbiddenWord | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const hiddenSet = useMemo(() => new Set(hiddenBuiltin), [hiddenBuiltin]);

  const rows: RowView[] = useMemo(() => {
    const all: RowView[] = [
      ...customWords.map((w) => ({ word: w, hidden: false, custom: true })),
      ...BUILTIN_WORDS.map((w) => ({
        word: w,
        hidden: hiddenSet.has(w.id),
        custom: false,
      })),
    ];
    const kw = keyword.trim().toLowerCase();
    return all.filter(({ word: w }) => {
      if (source === 'custom' && w.builtin) return false;
      if (source === 'builtin' && !w.builtin) return false;
      if (category !== 'all' && w.category !== category) return false;
      if (level !== 'all' && w.level !== level) return false;
      if (scope !== 'all' && w.scope !== scope) return false;
      if (kw) {
        const hay =
          `${w.word} ${w.reason} ${w.suggestion} ${w.category}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [customWords, hiddenSet, keyword, category, level, scope, source]);

  const stats = useMemo(() => {
    const activeBuiltin = BUILTIN_WORDS.length - hiddenBuiltin.length;
    return {
      total: activeBuiltin + customWords.length,
      builtin: BUILTIN_WORDS.length,
      disabled: hiddenBuiltin.length,
      custom: customWords.length,
    };
  }, [customWords.length, hiddenBuiltin.length]);

  const handleSubmit = (draft: WordDraft) => {
    if (editing) {
      if (editing.builtin) {
        toast.error('内置词条不可编辑，可停用后新增自定义词条');
        return;
      }
      updateCustomWord(editing.id, draft);
      toast.success('词条已更新');
    } else {
      const dup = [...customWords, ...BUILTIN_WORDS].some(
        (w) => w.word === draft.word,
      );
      if (dup) toast.message(`词条「${draft.word}」已存在，仍将新增`);
      addCustomWord(draft);
      toast.success('词条已新增');
    }
  };

  const handleExport = () => {
    const data = rows.map(({ word: w, hidden }) => ({
      word: w.word,
      category: w.category,
      level: w.level,
      reason: w.reason,
      suggestion: w.suggestion,
      scope: w.scope,
      status: w.builtin ? (hidden ? '已停用' : '内置') : '自定义',
    }));
    downloadText(
      `违禁词库_${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(data, null, 2),
    );
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text) as unknown;
      const list = Array.isArray(json) ? json : null;
      if (!list) throw new Error('格式应为 JSON 数组');
      const valid: WordDraft[] = [];
      for (const item of list) {
        const obj = item as Record<string, unknown>;
        if (
          typeof obj.word === 'string' &&
          typeof obj.reason === 'string' &&
          typeof obj.suggestion === 'string'
        ) {
          valid.push({
            word: obj.word,
            category:
              typeof obj.category === 'string' &&
              CATEGORIES.includes(obj.category)
                ? obj.category
                : CATEGORIES[0],
            level: ['high', 'medium', 'low'].includes(obj.level as string)
              ? (obj.level as RiskLevel)
              : 'medium',
            reason: obj.reason,
            suggestion: obj.suggestion,
            scope: obj.scope === '汽车行业' ? '汽车行业' : '通用',
          });
        }
      }
      if (!valid.length) throw new Error('未找到有效词条（需含 word/reason/suggestion 字段）');
      const count = importWords(valid);
      toast.success(`成功导入 ${count} 条自定义词条`);
    } catch (err) {
      toast.error(err instanceof Error ? `导入失败：${err.message}` : '导入失败');
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="违禁词库"
        description={`生效词条 ${stats.total} 条 · 内置 ${stats.builtin} 条 · 自定义 ${stats.custom} 条 · 已停用 ${stats.disabled} 条`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => importRef.current?.click()}
            >
              <Upload size={14} />
              导入
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download size={14} />
              导出
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetOpen(true)}
            >
              <RotateCcw size={14} />
              恢复默认
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus size={14} />
              新增词条
            </Button>
            <input
              ref={importRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                void handleImportFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </>
        }
      />

      {/* 筛选栏 */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-white px-5 py-2.5">
        <div className="relative w-56">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索词语 / 说明 / 建议"
            className="h-8 pl-8 text-[13px]"
          />
        </div>
        <Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
          <SelectTrigger className="h-8 w-28 text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部来源</SelectItem>
            <SelectItem value="builtin">内置词库</SelectItem>
            <SelectItem value="custom">自定义</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-8 w-36 text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">全部分类</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={level} onValueChange={(v) => setLevel(v as typeof level)}>
          <SelectTrigger className="h-8 w-28 text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部等级</SelectItem>
            <SelectItem value="high">高风险</SelectItem>
            <SelectItem value="medium">中风险</SelectItem>
            <SelectItem value="low">低风险</SelectItem>
          </SelectContent>
        </Select>
        <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
          <SelectTrigger className="h-8 w-28 text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部范围</SelectItem>
            <SelectItem value="通用">通用</SelectItem>
            <SelectItem value="汽车行业">汽车行业</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">
          共 {rows.length} 条
        </span>
      </div>

      {/* 词条表格 */}
      <div className="thin-scroll min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="w-32 px-5 py-2.5 font-medium">词语</th>
              <th className="w-24 px-3 py-2.5 font-medium">等级</th>
              <th className="w-32 px-3 py-2.5 font-medium">分类</th>
              <th className="px-3 py-2.5 font-medium">风险说明</th>
              <th className="w-44 px-3 py-2.5 font-medium">替换建议</th>
              <th className="w-20 px-3 py-2.5 font-medium">范围</th>
              <th className="w-28 px-5 py-2.5 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ word: w, hidden, custom }) => (
              <tr
                key={w.id}
                className={cn(
                  'border-t border-line/70 bg-white align-top transition-colors hover:bg-slate-50/70',
                  hidden && 'opacity-45',
                )}
              >
                <td className="px-5 py-2.5 font-medium">{w.word}</td>
                <td className="px-3 py-2.5">
                  <LevelBadge level={w.level} size="xs" />
                </td>
                <td className="px-3 py-2.5 text-slate-600">{w.category}</td>
                <td className="px-3 py-2.5 leading-relaxed text-slate-600">
                  {w.reason}
                </td>
                <td className="px-3 py-2.5 leading-relaxed text-emerald-700">
                  {w.suggestion}
                </td>
                <td className="px-3 py-2.5">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                    {w.scope}
                  </span>
                  {custom && (
                    <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary">
                      自定义
                    </span>
                  )}
                </td>
                <td className="px-5 py-2.5">
                  <div className="flex justify-end gap-0.5">
                    {custom ? (
                      <>
                        <button
                          type="button"
                          title="编辑"
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-foreground"
                          onClick={() => {
                            setEditing(w);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          title="删除"
                          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          onClick={() => {
                            deleteCustomWord(w.id);
                            toast.success('自定义词条已删除');
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        title={hidden ? '重新启用' : '停用该词'}
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-foreground"
                        onClick={() => toggleBuiltinWord(w.id, !hidden)}
                      >
                        {hidden ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="flex flex-col items-center gap-2 py-20 text-muted-foreground">
                    <BookOpen size={28} />
                    <p className="text-sm">没有符合筛选条件的词条</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <WordEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              恢复默认词库
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>将删除全部自定义词条，并重新启用所有被停用的内置词条。</p>
                <p className="font-medium text-foreground">
                  此操作不可撤销，确定继续吗？
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                resetLibrary();
                setResetOpen(false);
                toast.success('已恢复为内置默认词库');
              }}
            >
              恢复默认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
