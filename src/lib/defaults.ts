import {
  MODULE_META,
  type Brief,
  type BriefModule,
  type BriefModuleKey,
} from './types';
import { uid } from './storage';

export function createModule(key: BriefModuleKey, content = ''): BriefModule {
  const meta = MODULE_META.find((m) => m.key === key);
  return {
    id: uid('mod'),
    key,
    title: meta?.title ?? key,
    enTitle: meta?.enTitle ?? '',
    content,
    custom: key === 'custom',
  };
}

export function createEmptyModules(): BriefModule[] {
  return MODULE_META.map((m) => createModule(m.key));
}

export function createBrief(partial?: Partial<Brief>): Brief {
  const now = Date.now();
  return {
    id: uid('brief'),
    title: partial?.title ?? '未命名 Brief',
    project: partial?.project ?? '',
    modules: partial?.modules ?? createEmptyModules(),
    sourceText: partial?.sourceText ?? '',
    sourceName: partial?.sourceName,
    riskLevel: 'none',
    issueCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    tags: partial?.tags ?? [],
    createdAt: partial?.createdAt ?? now,
    updatedAt: partial?.updatedAt ?? now,
  };
}

export const MODULE_INDEX: Record<string, number> = Object.fromEntries(
  MODULE_META.map((m, i) => [m.key, i]),
);
