'use client';

import { useMemo } from 'react';
import type { ForbiddenWord, RiskLevel, ScanHit, ScanResult } from '@/lib/types';
import { scanText, topLevel } from '@/lib/scanner';

/** 单段文本的实时扫描 */
export function useScan(text: string, library: ForbiddenWord[]): ScanResult {
  return useMemo(() => scanText(text, library), [text, library]);
}

/** 多模块聚合扫描（按模块 id 分组命中）。
 *  合规备注(notes)模块中被引号包裹的禁用词属于"反面示例引用"，开启 ignoreQuoted 豁免，
 *  其余模块仍严格全量扫描。 */
/** 合规备注类模块（反面引用豁免）：通用模板 notes + KOC 模板的红线/口径/车名模块 */
const NOTE_KEYS = new Set(['notes', 'complianceRedline', 'wordingGuide', 'namingRule']);

export function useModuleScan(
  modules: Array<{ id: string; key?: string; content: string; kind?: string }>,
  library: ForbiddenWord[],
): {
  byModule: Map<string, ScanResult>;
  all: ScanHit[];
  result: ScanResult;
} {
  return useMemo(() => {
    const byModule = new Map<string, ScanResult>();
    const all: ScanHit[] = [];
    modules.forEach((m) => {
      const isNote = m.kind === 'note' || (m.key ? NOTE_KEYS.has(m.key) : false);
      const result = scanText(m.content, library, {
        ignoreQuoted: isNote,
      });
      byModule.set(m.id, result);
      result.hits.forEach((h) => all.push({ ...h, moduleId: m.id }));
    });
    const result: ScanResult = {
      hits: all,
      highCount: all.filter((h) => h.level === 'high').length,
      mediumCount: all.filter((h) => h.level === 'medium').length,
      lowCount: all.filter((h) => h.level === 'low').length,
      total: all.length,
    };
    return { byModule, all, result };
  }, [modules, library]);
}

export type { ScanHit };
export { topLevel };

/** 依据风险等级排序命中（高 → 中 → 低，再按位置） */
const LEVEL_ORDER: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };
export function sortHits(hits: ScanHit[]): ScanHit[] {
  return [...hits].sort(
    (a, b) =>
      LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] ||
      a.start - b.start ||
      a.word.localeCompare(b.word),
  );
}
