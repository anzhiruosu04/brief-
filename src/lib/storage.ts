'use client';

import type { AppSettings, Brief, ForbiddenWord } from './types';
import { BUILTIN_WORDS } from './data/forbiddenWords';

const KEYS = {
  briefs: 'brief-workbench:briefs:v1',
  customWords: 'brief-workbench:custom-words:v1',
  hiddenBuiltin: 'brief-workbench:hidden-builtin:v1',
  settings: 'brief-workbench:settings:v1',
  seeded: 'brief-workbench:seeded:v1',
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  feishuAppId: '',
  feishuAppSecret: '',
  aiModel: 'doubao-seed-2-0-pro-260215',
  aiTemperature: 0.4,
  includeCustomWords: true,
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- Briefs ----------

export function loadBriefs(): Brief[] {
  if (typeof window === 'undefined') return [];
  return safeParse<Brief[]>(localStorage.getItem(KEYS.briefs), []);
}

export function saveBriefs(briefs: Brief[]): void {
  localStorage.setItem(KEYS.briefs, JSON.stringify(briefs));
}

// ---------- 词库 ----------

export function loadCustomWords(): ForbiddenWord[] {
  if (typeof window === 'undefined') return [];
  return safeParse<ForbiddenWord[]>(localStorage.getItem(KEYS.customWords), []);
}

export function saveCustomWords(words: ForbiddenWord[]): void {
  localStorage.setItem(KEYS.customWords, JSON.stringify(words));
}

/** 被用户停用的内置词条 id */
export function loadHiddenBuiltin(): string[] {
  if (typeof window === 'undefined') return [];
  return safeParse<string[]>(localStorage.getItem(KEYS.hiddenBuiltin), []);
}

export function saveHiddenBuiltin(ids: string[]): void {
  localStorage.setItem(KEYS.hiddenBuiltin, JSON.stringify(ids));
}

// ---------- 设置 ----------

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  return {
    ...DEFAULT_SETTINGS,
    ...safeParse<Partial<AppSettings>>(
      localStorage.getItem(KEYS.settings),
      {},
    ),
  };
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings));
}

export { BUILTIN_WORDS, KEYS as STORAGE_KEYS };
