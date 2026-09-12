'use client';

import { useCallback, useRef, useState } from 'react';
import { MODULE_META, type BriefModule, type BriefModuleKey } from '@/lib/types';
import { uid } from '@/lib/storage';

/** 根据 AI 返回的模块标题匹配标准模块 key，未命中则归为自定义模块 */
function resolveModuleMeta(title: string): {
  key: BriefModuleKey;
  enTitle: string;
} {
  const hit = MODULE_META.find(
    (meta) => title.includes(meta.title) || title.includes(meta.enTitle),
  );
  if (hit) return { key: hit.key, enTitle: hit.enTitle };
  return { key: 'custom', enTitle: 'Appendix' };
}

export type GenStatus = 'idle' | 'thinking' | 'writing' | 'done' | 'error';

export interface GenState {
  status: GenStatus;
  modules: BriefModule[];
  error: string | null;
}

interface GenerateParams {
  material: string;
  requirement?: string;
  existingTitle?: string;
  model: string;
  onTitle?: (title: string) => void;
  onModulesChange: (modules: BriefModule[]) => void;
}

interface StreamEvent {
  type?: string;
  [k: string]: unknown;
}

export function useBriefAI() {
  const [state, setState] = useState<GenState>({
    status: 'idle',
    modules: [],
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ status: 'idle', modules: [], error: null });
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setState((s) =>
      s.status === 'done' ? s : { ...s, status: 'done' },
    );
  }, []);

  const generate = useCallback(
    async ({
      material,
      requirement,
      model,
      onTitle,
      onModulesChange,
    }: GenerateParams) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ status: 'thinking', modules: [], error: null });

      try {
        const resp = await fetch('/api/ai/generate-brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ material, requirement, model }),
          signal: controller.signal,
        });

        if (!resp.ok || !resp.body) {
          const errBody: { error?: string } | null = await resp
            .json()
            .catch(() => null);
          throw new Error(errBody?.error ?? `生成失败（HTTP ${resp.status}）`);
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        const finished: BriefModule[] = [];
        let current: BriefModule | null = null;

        const flush = () => {
          const snapshot = current ? [...finished, current] : [...finished];
          setState((s) => ({ ...s, modules: snapshot }));
          onModulesChange(snapshot);
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload) continue;
            let evt: StreamEvent;
            try {
              evt = JSON.parse(payload) as StreamEvent;
            } catch {
              continue;
            }

            switch (evt.type) {
              case 'status':
                if (evt.stage === 'thinking') {
                  setState((s) => ({ ...s, status: 'thinking' }));
                }
                break;
              case 'title':
                if (typeof evt.title === 'string' && evt.title) {
                  onTitle?.(evt.title);
                }
                break;
              case 'module_start': {
                if (current) finished.push(current);
                const modTitle = String(evt.title ?? '模块');
                const meta = resolveModuleMeta(modTitle);
                current = {
                  id: uid('mod'),
                  key: meta.key,
                  title: modTitle,
                  enTitle: meta.enTitle,
                  content: '',
                  custom: meta.key === 'custom',
                };
                setState((s) => ({ ...s, status: 'writing' }));
                flush();
                break;
              }
              case 'module_delta':
                if (current && typeof evt.delta === 'string') {
                  current.content += evt.delta;
                  flush();
                }
                break;
              case 'module_end':
                if (
                  current &&
                  typeof evt.suggestion === 'string' &&
                  evt.suggestion
                ) {
                  current.content +=
                    (current.content.endsWith('\n') ? '' : '\n') +
                    `【合规提示】${evt.suggestion}`;
                  flush();
                }
                break;
              case 'complete': {
                if (current) finished.push(current);
                current = null;
                const rawModules =
                  (evt.modules as Array<{ title: string; content: string }>) ??
                  [];
                const finalModules: BriefModule[] = finished.length
                  ? finished
                  : rawModules.map((m) => {
                      const meta = resolveModuleMeta(m.title);
                      return {
                        id: uid('mod'),
                        key: meta.key,
                        title: m.title,
                        enTitle: meta.enTitle,
                        content: m.content,
                        custom: meta.key === 'custom',
                      };
                    });
                setState({
                  status: 'done',
                  modules: finalModules,
                  error: null,
                });
                onModulesChange(finalModules);
                break;
              }
              case 'error':
                throw new Error(String(evt.message ?? '生成失败'));
              default:
                break;
            }
          }
        }

        // 流提前结束时以已收集内容兜底
        if (current) finished.push(current);
        if (finished.length) {
          setState((s) =>
            s.status === 'done'
              ? s
              : { status: 'done', modules: finished, error: null },
          );
          onModulesChange(finished);
        } else {
          setState((s) =>
            s.status === 'done'
              ? s
              : {
                  status: 'error',
                  modules: [],
                  error: '模型未返回有效内容，请更换素材后重试',
                },
          );
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setState((s) => ({ ...s, status: 'done' }));
          return;
        }
        setState({
          status: 'error',
          modules: [],
          error: err instanceof Error ? err.message : '生成失败，请重试',
        });
      }
    },
    [],
  );

  return { state, generate, stop, reset };
}
