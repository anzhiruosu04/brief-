'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CATEGORIES } from '@/lib/data/forbiddenWords';
import type { ForbiddenWord, RiskLevel, WordScope } from '@/lib/types';

export interface WordDraft {
  word: string;
  category: string;
  level: RiskLevel;
  reason: string;
  suggestion: string;
  scope: WordScope;
}

const EMPTY: WordDraft = {
  word: '',
  category: CATEGORIES[0],
  level: 'medium',
  reason: '',
  suggestion: '',
  scope: '通用',
};

export function WordEditDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ForbiddenWord | null;
  onSubmit: (draft: WordDraft) => void;
}) {
  const [draft, setDraft] = useState<WordDraft>(EMPTY);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setDraft(
        initial
          ? {
              word: initial.word,
              category: initial.category,
              level: initial.level,
              reason: initial.reason,
              suggestion: initial.suggestion,
              scope: initial.scope,
            }
          : EMPTY,
      );
      setError('');
    }
  }, [open, initial]);

  const submit = () => {
    if (!draft.word.trim()) {
      setError('请填写违禁词语');
      return;
    }
    if (!draft.reason.trim() || !draft.suggestion.trim()) {
      setError('请填写风险说明与替换建议');
      return;
    }
    onSubmit({ ...draft, word: draft.word.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? '编辑词条' : '新增词条'}</DialogTitle>
          <DialogDescription>
            词条保存后立即参与全部实时扫描；内置词条仅可停用，自定义词条可自由修改。
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>违禁词语 *</Label>
            <Input
              value={draft.word}
              onChange={(e) => setDraft({ ...draft, word: e.target.value })}
              placeholder="如：全球领先"
            />
          </div>
          <div className="space-y-1.5">
            <Label>适用范围</Label>
            <Select
              value={draft.scope}
              onValueChange={(v) =>
                setDraft({ ...draft, scope: v as WordScope })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="通用">通用</SelectItem>
                <SelectItem value="汽车行业">汽车行业</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>分类</Label>
            <Select
              value={draft.category}
              onValueChange={(v) => setDraft({ ...draft, category: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>风险等级</Label>
            <Select
              value={draft.level}
              onValueChange={(v) =>
                setDraft({ ...draft, level: v as RiskLevel })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">高风险</SelectItem>
                <SelectItem value="medium">中风险</SelectItem>
                <SelectItem value="low">低风险</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>风险说明 *</Label>
            <Textarea
              value={draft.reason}
              onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
              placeholder="说明违规依据，如：《广告法》第九条禁止使用国家级、最高级等绝对化用语"
              className="min-h-16 text-[13px]"
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>替换建议 *</Label>
            <Input
              value={draft.suggestion}
              onChange={(e) =>
                setDraft({ ...draft, suggestion: e.target.value })
              }
              placeholder="合规替代表述，如：行业前列 / 表现领先"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={submit}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
