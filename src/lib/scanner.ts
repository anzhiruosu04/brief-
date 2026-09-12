import type { ForbiddenWord, ScanHit, ScanResult } from './types';

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface CompiledWord {
  word: ForbiddenWord;
  lower: string;
}

/**
 * 违禁词扫描引擎（纯函数，可在客户端/服务端运行）。
 * 策略：所有词条合并为一个正则（长词优先，保证“最先进”先于“最”命中），
 * 单次遍历文本；命中区间相互重叠时保留先匹配到的长词，避免重复计数。
 */
export function scanText(
  text: string,
  library: ForbiddenWord[],
): ScanResult {
  const empty: ScanResult = {
    hits: [],
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    total: 0,
  };
  if (!text || library.length === 0) return empty;

  const compiled: CompiledWord[] = library
    .filter((w) => w.word.trim().length > 0)
    .map((word) => ({ word, lower: word.word.toLowerCase() }))
    // 长词优先排序，正则 alternation 按顺序取首个匹配
    .sort((a, b) => b.lower.length - a.lower.length);

  const pattern = compiled
    .map((c) => escapeRegExp(c.lower))
    .join('|');
  const regex = new RegExp(pattern, 'gi');

  // 以小写文本为基准做 indexOf 式匹配，保证中英文大小写不敏感且位置准确
  const lowerText = text.toLowerCase();
  const hits: ScanHit[] = [];
  const occurrenceMap = new Map<string, number>();
  const occupied: Array<[number, number]> = [];

  const overlaps = (start: number, end: number): boolean =>
    occupied.some(([s, e]) => start < e && end > s);

  let match: RegExpExecArray | null;
  while ((match = regex.exec(lowerText)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (match[0].length === 0) {
      regex.lastIndex += 1;
      continue;
    }
    if (overlaps(start, end)) continue;
    const found = compiled.find((c) => c.lower === match![0]);
    if (!found) continue;
    occupied.push([start, end]);
    const key = found.word.id;
    const occurrence = (occurrenceMap.get(key) ?? 0) + 1;
    occurrenceMap.set(key, occurrence);
    hits.push({
      wordId: found.word.id,
      word: found.word.word,
      category: found.word.category,
      level: found.word.level,
      reason: found.word.reason,
      suggestion: found.word.suggestion,
      scope: found.word.scope,
      start,
      end,
      occurrence,
    });
  }

  hits.sort((a, b) => a.start - b.start);
  const highCount = hits.filter((h) => h.level === 'high').length;
  const mediumCount = hits.filter((h) => h.level === 'medium').length;
  const lowCount = hits.filter((h) => h.level === 'low').length;
  return { hits, highCount, mediumCount, lowCount, total: hits.length };
}

/** 将文本按命中切分为片段，便于渲染高亮 */
export interface TextSegment {
  text: string;
  hit?: ScanHit;
}

export function segmentText(
  text: string,
  result: ScanResult,
): TextSegment[] {
  if (result.hits.length === 0) return [{ text }];
  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const hit of result.hits) {
    if (hit.start > cursor) {
      segments.push({ text: text.slice(cursor, hit.start) });
    }
    segments.push({ text: text.slice(hit.start, hit.end), hit });
    cursor = hit.end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }
  return segments;
}

/** 用替换建议整体替换文本中某违禁词的全部出现位置（不区分大小写匹配原词） */
export function replaceAllWord(
  text: string,
  targetWord: string,
  replacement: string,
): string {
  if (!targetWord) return text;
  const regex = new RegExp(escapeRegExp(targetWord), 'gi');
  return text.replace(regex, replacement);
}

/** 风险汇总：返回整体最高风险等级 */
export function topLevel(
  result: Pick<ScanResult, 'highCount' | 'mediumCount' | 'lowCount'>,
): 'none' | 'high' | 'medium' | 'low' {
  if (result.highCount > 0) return 'high';
  if (result.mediumCount > 0) return 'medium';
  if (result.lowCount > 0) return 'low';
  return 'none';
}

/** 去重后的命中词条（按词聚合，附出现次数） */
export interface AggregatedHit {
  word: string;
  level: ScanHit['level'];
  category: string;
  reason: string;
  suggestion: string;
  scope: ScanHit['scope'];
  count: number;
}

export function aggregateHits(result: ScanResult): AggregatedHit[] {
  const map = new Map<string, AggregatedHit>();
  for (const hit of result.hits) {
    const existing = map.get(hit.word);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(hit.word, {
        word: hit.word,
        level: hit.level,
        category: hit.category,
        reason: hit.reason,
        suggestion: hit.suggestion,
        scope: hit.scope,
        count: 1,
      });
    }
  }
  const order = { high: 0, medium: 1, low: 2 };
  return Array.from(map.values()).sort(
    (a, b) =>
      order[a.level] - order[b.level] || b.count - a.count || a.word.localeCompare(b.word),
  );
}
