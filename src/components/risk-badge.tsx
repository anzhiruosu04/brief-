import { cn } from '@/lib/utils';
import type { RiskLevel, ScanResult } from '@/lib/types';

const LEVEL_STYLE: Record<RiskLevel, string> = {
  high: 'bg-red-50 text-red-600 border-red-200',
  medium: 'bg-amber-50 text-amber-600 border-amber-200',
  low: 'bg-sky-50 text-sky-600 border-sky-200',
};

const LEVEL_LABEL: Record<RiskLevel, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};

export function LevelBadge({
  level,
  size = 'sm',
}: {
  level: RiskLevel;
  size?: 'sm' | 'xs';
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded border font-medium',
        LEVEL_STYLE[level],
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-1 text-[11px]',
      )}
    >
      {LEVEL_LABEL[level]}
    </span>
  );
}

export function OverallRiskTag({
  result,
  className,
}: {
  result: Pick<ScanResult, 'total' | 'highCount' | 'mediumCount' | 'lowCount'>;
  className?: string;
}) {
  if (result.total === 0) {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600',
          className,
        )}
      >
        未发现风险
      </span>
    );
  }
  const top: RiskLevel =
    result.highCount > 0
      ? 'high'
      : result.mediumCount > 0
        ? 'medium'
        : 'low';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        LEVEL_STYLE[top],
        className,
      )}
    >
      {LEVEL_LABEL[top]} · {result.total} 处
    </span>
  );
}

export const SCOPE_LABEL = {
  通用: '通用',
  汽车行业: '汽车',
} as const;
