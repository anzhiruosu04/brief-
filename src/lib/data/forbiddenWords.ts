import type { ForbiddenWord, WordTuple } from '../types';
import { part1 } from './part1';
import { part2 } from './part2';
import { part3 } from './part3';
import { part4 } from './part4';
import { part5 } from './part5';
import { part6 } from './part6';

const ALL_TUPLES: WordTuple[] = [
  ...part1,
  ...part2,
  ...part3,
  ...part4,
  ...part5,
  ...part6,
];

/** 内置默认词库（564 条），id 稳定，自定义词库以 custom- 前缀区分 */
export const BUILTIN_WORDS: ForbiddenWord[] = ALL_TUPLES.map((t, index) => ({
  id: `builtin-${String(index + 1).padStart(4, '0')}`,
  word: t[0],
  category: t[1],
  level: t[2],
  reason: t[3],
  suggestion: t[4],
  scope: t[5] === 1 ? '汽车行业' : '通用',
  builtin: true,
}));

export const CATEGORIES: string[] = Array.from(
  new Set(BUILTIN_WORDS.map((w) => w.category)),
);

export const WORD_LIBRARY_VERSION = '1.0.0';
export const WORD_LIBRARY_TOTAL = BUILTIN_WORDS.length;
