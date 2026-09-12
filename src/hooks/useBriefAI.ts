'use client';

import { useCallback, useRef, useState } from 'react';
import type { BriefModule, BriefModuleKey, TemplateModuleDef } from '@/lib/types';
import { GENERAL_TEMPLATE, KOC_TEMPLATE } from '@/lib/templates';
import { uid } from '@/lib/storage';

/** 两套模板的全部模块定义，用于把 AI 输出的 key 映射为标题/英文名/形态 */
const ALL_DEFS: TemplateModuleDef[] = [
  ...GENERAL_TEMPLATE.modules,
  ...KOC_TEMPLATE.modules,
];

function findDef(key: string): TemplateModuleDef | undefined {
  return ALL_DEFS.find((d) => d.key === key);
}

/** 根据 AI 返回的模块标题兜底匹配模块定义，未命中则归为自定义模块 */
function resolveByTitle(title: string): TemplateModuleDef {
  const hit = ALL_DEFS.find(
    (meta) => title.includes(meta.title) || (meta.enTitle && title.includes(meta.enTitle)),
  );
  return (
    hit ?? {
      key: 'custom',
      title: title || '附加模块',
      enTitle: 'Appendix',
      placeholder: '',
    }
  );
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
  template?: 'general' | 'koc';
  onTitle?: (title: string) => void;
  onModulesChange: (modules: BriefModule[]) => void;
}

export type GenerateResult =
  | { ok: true; aborted: false }
  | { ok: true; aborted: true }
  | { ok: false; aborted: false; error: string };

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
      template = 'general',
      onTitle,
      onModulesChange,
    }: GenerateParams): Promise<GenerateResult> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ status: 'thinking', modules: [], error: null });

      try {
        const resp = await fetch('/api/ai/generate-brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ material, requirement, model, template }),
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
        // SSE 帧缓冲（按 \n\n 分帧）；textBuffer 为模型正文（含模块标记）的累积
        let frameBuffer = '';
        let textBuffer = '';
        // 同一标记序号在流式过程中保持稳定 id，避免模块卡片频繁重挂载
        const stableIds: string[] = [];
        const getId = (index: number): string =>
          stableIds[index] ?? (stableIds[index] = uid('mod'));
        // 标题只在首次解析到时回调一次
        let reportedTitle = false;

        /** 提取首行 <<<TITLE:xxx>>>，返回 { title, text }；标记可能跨 chunk */
        const extractTitle = (full: string): { title: string | null; text: string } => {
          const m = /^<<<TITLE:([^>]*)>>>/.exec(full.trimStart());
          if (!m) return { title: null, text: full };
          const title = m[1].trim();
          return { title: title || null, text: full.replace(/^\s*<<<TITLE:[^>]*>>>\s*/, '') };
        };

        /**
         * 将正文按 <<<MODULE:key|模块名>>> 标记切分。
         * 标记可能跨 chunk 到达：若末尾出现半个标记（'<<<' 起始但无闭合 '>>>'），
         * 则只解析到该半个标记之前，残片保留在 textBuffer 等待与下一 chunk 拼合。
         * 返回 safeLen 表示可安全解析的前缀长度。
         */
        const buildModules = (full: string): { modules: BriefModule[]; safeLen: number } => {
          let usable = full.length;
          const lastOpen = full.lastIndexOf('<<<');
          if (lastOpen !== -1) {
            const lastClose = full.lastIndexOf('>>>');
            if (lastClose < lastOpen) {
              // 末尾是一个尚未闭合的标记，截掉它及其后内容
              usable = lastOpen;
            }
          }
          const safe = full.slice(0, usable);

          const segs: { key: BriefModuleKey; title: string; body: string }[] = [];
          const markerRe = /<<<MODULE:([^|>]+)\|([^>]*)>>>/g;
          let lastIndex = 0;
          let curKey: BriefModuleKey | null = null;
          let curTitle = '';
          let m: RegExpExecArray | null;
          while ((m = markerRe.exec(safe)) !== null) {
            const body = safe.slice(lastIndex, m.index);
            if (curKey) segs.push({ key: curKey, title: curTitle, body });
            curKey = (m[1].trim() as BriefModuleKey) || 'custom';
            curTitle = m[2].trim() || '模块';
            lastIndex = markerRe.lastIndex;
          }
          if (curKey) {
            segs.push({ key: curKey, title: curTitle, body: safe.slice(lastIndex) });
          }
          const modules = segs.map((s, i) => {
            const byKey = findDef(s.key);
            const def = byKey ?? resolveByTitle(s.title);
            const content = s.body.replace(/^\n+/, '').replace(/\s+$/, '');
            return {
              id: getId(i),
              key: def.key,
              title: s.title || def.title,
              enTitle: def.enTitle,
              content,
              kind: def.kind,
              custom: !byKey,
            };
          });
          return { modules, safeLen: usable };
        };

        const emit = () => {
          const { title, text } = extractTitle(textBuffer);
          if (title && !reportedTitle) {
            reportedTitle = true;
            onTitle?.(title);
          }
          const { modules: mods } = buildModules(text);
          setState((s) => ({
            ...s,
            status: mods.length ? 'writing' : 'thinking',
            modules: mods,
          }));
          onModulesChange(mods);
        };

        let serverError: string | null = null;

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          frameBuffer += decoder.decode(value, { stream: true });

          // 按 SSE 帧（空行分隔）处理
          const frames = frameBuffer.split('\n\n');
          frameBuffer = frames.pop() ?? '';

          for (const frame of frames) {
            const lines = frame.split('\n');
            let event = 'message';
            let dataStr = '';
            for (const line of lines) {
              if (line.startsWith('event:')) event = line.slice(6).trim();
              else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
            }
            if (!dataStr) continue;
            let data: StreamEvent;
            try {
              data = JSON.parse(dataStr) as StreamEvent;
            } catch {
              continue;
            }

            if (event === 'delta' && typeof data.text === 'string') {
              textBuffer += data.text;
              emit();
            } else if (event === 'title' && typeof data.title === 'string') {
              onTitle?.(data.title);
            } else if (event === 'done') {
              // 正常结束
            } else if (event === 'error') {
              serverError = String(data.message ?? '生成失败');
            }
          }
        }

        if (serverError) throw new Error(serverError);

        // 收尾：以已累积正文解析出的模块为准
        const finalText = extractTitle(textBuffer).text;
        const { modules: finalModules } = buildModules(finalText);
        if (finalModules.length) {
          setState({ status: 'done', modules: finalModules, error: null });
          onModulesChange(finalModules);
          return { ok: true, aborted: false };
        }
        const emptyError = '模型未返回有效内容，请更换素材后重试';
        setState({
          status: 'error',
          modules: [],
          error: emptyError,
        });
        return { ok: false, aborted: false, error: emptyError };
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setState((s) => ({ ...s, status: 'done' }));
          return { ok: true, aborted: true };
        }
        const message = err instanceof Error ? err.message : '生成失败，请重试';
        setState({
          status: 'error',
          modules: [],
          error: message,
        });
        return { ok: false, aborted: false, error: message };
      }
    },
    [],
  );

  return { state, generate, stop, reset };
}
