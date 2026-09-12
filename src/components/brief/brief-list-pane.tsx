'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Search, FileText, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useAppState } from '@/hooks/useAppState';
import { OverallRiskTag } from '@/components/risk-badge';
import { cn, formatDate } from '@/lib/utils';
import type { Brief } from '@/lib/types';

export function BriefListPane({ compact = false }: { compact?: boolean }) {
  const { briefs, createNewBrief, deleteBrief, duplicateBrief } = useAppState();
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const activeId = params?.id;
  const [keyword, setKeyword] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Brief | null>(null);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return briefs;
    return briefs.filter(
      (b) =>
        b.title.toLowerCase().includes(kw) ||
        b.modules.some((m) => m.content.toLowerCase().includes(kw)),
    );
  }, [briefs, keyword]);

  const handleCreate = () => {
    const brief = createNewBrief();
    router.push(`/briefs/${brief.id}`);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="space-y-2 border-b border-line p-3">
        <Button onClick={handleCreate} className="w-full" size="sm">
          <Plus size={15} />
          新建 Brief
        </Button>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索标题或正文"
            className="h-8 pl-8 text-[13px]"
          />
        </div>
      </div>

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="px-3 py-10 text-center text-xs text-muted-foreground">
            {briefs.length === 0 ? '还没有 Brief，点击上方按钮创建' : '没有匹配的 Brief'}
          </div>
        ) : (
          <ul className="space-y-1">
            {filtered.map((brief) => (
              <li key={brief.id}>
                <div
                  className={cn(
                    'group rounded-lg border px-3 py-2.5 transition-colors',
                    activeId === brief.id
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-transparent hover:bg-slate-50',
                  )}
                >
                  <Link
                    href={`/briefs/${brief.id}`}
                    className="block"
                    title={brief.title}
                  >
                    <div className="flex items-center gap-2">
                      <FileText
                        size={14}
                        className={cn(
                          'shrink-0',
                          activeId === brief.id
                            ? 'text-primary'
                            : 'text-slate-400',
                        )}
                      />
                      <span className="truncate text-[13.5px] font-medium">
                        {brief.title}
                      </span>
                    </div>
                    {!compact && (
                      <div className="mt-1.5 flex items-center justify-between pl-6">
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(brief.updatedAt)}
                        </span>
                        <OverallRiskTag
                          result={{
                            total: brief.issueCount,
                            highCount: brief.highCount,
                            mediumCount: brief.mediumCount,
                            lowCount: brief.lowCount,
                          }}
                        />
                      </div>
                    )}
                  </Link>
                  <div className="mt-1 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      title="复制"
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-foreground"
                      onClick={() => {
                        const copy = duplicateBrief(brief.id);
                        if (copy) router.push(`/briefs/${copy.id}`);
                      }}
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      type="button"
                      title="删除"
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      onClick={() => setPendingDelete(brief)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除 Brief</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除「{pendingDelete?.title}」吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (!pendingDelete) return;
                deleteBrief(pendingDelete.id);
                if (activeId === pendingDelete.id) router.push('/briefs');
                setPendingDelete(null);
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
