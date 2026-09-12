import { Fragment, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ScanHit } from '@/lib/types';

const LEVEL_CLASS = {
  high: 'risk-high',
  medium: 'risk-medium',
  low: 'risk-low',
} as const;

/**
 * 将纯文本按命中区间渲染为高亮片段。
 * hits 需为同一段文本内、按 start 升序排列的命中。
 */
export function HighlightedText({
  text,
  hits,
  flashingIndex = -1,
  onHitClick,
  className,
}: {
  text: string;
  hits: ScanHit[];
  flashingIndex?: number;
  onHitClick?: (hit: ScanHit) => void;
  className?: string;
}) {
  const segments = useMemo(() => {
    const segs: Array<
      | { type: 'text'; content: string }
      | { type: 'hit'; hit: ScanHit; hitIndex: number }
    > = [];
    let cursor = 0;
    hits.forEach((hit, idx) => {
      if (hit.start < cursor) return; // 跳过重叠区间
      if (hit.start > cursor) {
        segs.push({ type: 'text', content: text.slice(cursor, hit.start) });
      }
      segs.push({ type: 'hit', hit, hitIndex: idx });
      cursor = hit.end;
    });
    if (cursor < text.length) {
      segs.push({ type: 'text', content: text.slice(cursor) });
    }
    return segs;
  }, [text, hits]);

  return (
    <div className={cn('whitespace-pre-wrap break-words', className)}>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <Fragment key={i}>{seg.content}</Fragment>;
        }
        const h = seg.hit;
        const levelText =
          h.level === 'high' ? '高' : h.level === 'medium' ? '中' : '低';
        const title = `${levelText}风险｜${h.category}\n${h.reason}\n建议：${h.suggestion}`;
        return (
          <button
            type="button"
            key={i}
            title={title}
            onClick={() => onHitClick?.(h)}
            className={cn(
              'risk-hit',
              LEVEL_CLASS[h.level],
              seg.hitIndex === flashingIndex && 'risk-flash',
              onHitClick && 'cursor-pointer hover:brightness-95',
            )}
          >
            {text.slice(h.start, h.end)}
          </button>
        );
      })}
    </div>
  );
}
