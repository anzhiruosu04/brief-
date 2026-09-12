'use client';

import { useMemo } from 'react';
import type { ForbiddenWord, RiskLevel, ScanHit, ScanResult } from '@/lib/types';
import { scanText, topLevel } from '@/lib/scanner';

/** 单段文本的实时扫描 */
export function useScan(text: string, library: ForbiddenWord[]): ScanResult {
  return useMemo(() => scanText(text, library), [text, library]);
}

/** 多模块聚合扫描（按模块 id 分组命中） */
export function useModuleScan(
  modules: Array<{ id: string; content: string }>,
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
      const result = scanText(m.content, library);
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
