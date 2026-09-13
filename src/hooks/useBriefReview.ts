'use client';

import { useRef, useState } from 'react';

// Brief 对照审核结果（仅核对 Brief 自身的硬性要求）。

export interface ReviewIssue {
  id: string;
  /** Brief 中的要求/禁止条款 */
  requirement: string;
  /** 问题说明（缺了什么 / 哪里违规） */
  detail: string;
  /** 修改或补充建议 */
  suggestion: string;
  /** 违规项：草稿中的原文片段（用于定位）；缺失项为空 */
  quote?: string;
}

export interface ReviewResult {
  /** 模型给出的结论 */
  verdict: 'pass' | 'fail' | 'unknown';
  summary: string;
  missing: ReviewIssue[];
  violations: ReviewIssue[];
  suggestions: string[];
  /** 是否存在未闭合的块（流被中断） */
  partial: boolean;
}

type BlockType = 'OVERALL' | 'MISSING' | 'VIOLATION' | 'SUGGESTION';

const MARKERS: BlockType[] = ['OVERALL', 'MISSING', 'VIOLATION', 'SUGGESTION'];

/** 按标记把原文切成块（保留出现顺序，含重复块类型）。 */
function splitBlocks(raw: string): Array<{ type: BlockType; body: string }> {
  const tagRe = /<<<(OVERALL|MISSING|VIOLATION|SUGGESTION)>>>/g;
  const marks: Array<{ type: BlockType; tagEnd: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(raw)) !== null) {
    marks.push({ type: m[1] as BlockType, tagEnd: m.index + m[0].length });
  }
  return marks.map((mark, i) => {
    const bodyStart = mark.tagEnd;
    const bodyEnd = i + 1 < marks.length ? marks[i + 1].tagEnd - `<<<${marks[i + 1].type}>>>`.length : raw.length;
    return { type: mark.type, body: raw.slice(bodyStart, bodyEnd).trim() };
  });
}

/** 取“字段名：值”，值截至下一个已知字段或块尾。 */
function field(body: string, names: string[]): string {
  const label = names.join('|');
  const re = new RegExp(`(?:${label})[：:]\\s*([\\s\\S]*?)(?=\\n\\s*(?:要求|缺失|草稿|quote|建议|结论|说明)[：:]|$)`);
  return body.match(re)?.[1]?.trim() ?? '';
}

/** 从累积文本解析审核结果。incomplete=true 时最后一个仍在流式写入的块也参与渲染。 */
function parseReview(raw: string, incomplete: boolean): ReviewResult {
  const result: ReviewResult = {
    verdict: 'unknown',
    summary: '',
    missing: [],
    violations: [],
    suggestions: [],
    partial: false,
  };

  const blocks = splitBlocks(raw);
  let seq = 0;
  const nextId = () => `rv-${(seq += 1)}`;

  blocks.forEach((b, i) => {
    const isLastStreaming = incomplete && i === blocks.length - 1;
    if (isLastStreaming) result.partial = true;

    if (b.type === 'OVERALL') {
      const c = field(b.body, ['结论']);
      const sm = field(b.body, ['说明']);
      result.verdict = /不通过|未通过|不符合/.test(c)
        ? 'fail'
        : /通过/.test(c)
          ? 'pass'
          : 'unknown';
      result.summary = sm || b.body.replace(/^[\s\S]*?结论[：:][^\n]*\n?/, '').trim();
    } else if (b.type === 'MISSING' || b.type === 'VIOLATION') {
      const issue: ReviewIssue = {
        id: nextId(),
        requirement: field(b.body, ['要求']),
        detail:
          b.type === 'MISSING'
            ? field(b.body, ['缺失'])
            : field(b.body, ['草稿']),
        suggestion: field(b.body, ['建议']),
        quote: b.type === 'VIOLATION' ? field(b.body, ['quote']) : '',
      };
      // 流式中尚未写全的块先不进清单，避免半截条目闪动。
      if (isLastStreaming) return;
      if (b.type === 'MISSING') result.missing.push(issue);
      else result.violations.push(issue);
    } else if (b.type === 'SUGGESTION' && !isLastStreaming) {
      result.suggestions = b.body
        .split('\n')
        .map((l) => l.replace(/^\s*[-·]\s*/, '').trim())
        .filter(Boolean);
    }
  });

  // 模型结论与实际清单不一致时，以清单为准，避免漏判。
  if (result.verdict === 'pass' && (result.missing.length || result.violations.length)) {
    result.verdict = 'fail';
  }
  return result;
}

export function useBriefReview() {
  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState('');
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const abort = () => abortRef.current?.abort();

  const start = async (params: { brief: string; draft: string; model?: string }): Promise<void> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    setRaw('');
    setResult(null);

    let acc = '';
    const reparse = (done: boolean) => setResult(parseReview(acc, !done));

    try {
      const resp = await fetch('/api/ai/review-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: controller.signal,
      });
      if (!resp.ok || !resp.body) {
        const data = (await resp.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || `审核请求失败（${resp.status}）`);
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        for (const frame of frames) {
          let event = '';
          let data = '';
          for (const line of frame.split('\n')) {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            else if (line.startsWith('data:')) data += line.slice(5).trim();
          }
          if (!data) continue;
          const payload = JSON.parse(data) as { text?: string; message?: string; ok?: boolean };
          if (event === 'delta' && payload.text) {
            acc += payload.text;
            setRaw(acc);
            reparse(false);
          } else if (event === 'error') {
            throw new Error(payload.message || '审核失败');
          }
        }
      }
      reparse(true);
      setRaw(acc);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError((e as Error).message || '审核失败');
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const reset = () => {
    abort();
    setLoading(false);
    setRaw('');
    setResult(null);
    setError(null);
  };

  return { loading, result, raw, error, start, abort, reset };
}
