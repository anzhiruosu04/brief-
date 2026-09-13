import { NextRequest } from 'next/server';
import { Config, HeaderUtils, LLMClient } from 'coze-coding-dev-sdk';
import {
  buildModuleGuides,
  buildModuleLines,
  buildSystemPrompt,
  type GenTemplateId,
} from '@/lib/server-templates';

export const runtime = 'nodejs';
export const maxDuration = 120;

function buildUserPrompt(params: {
  material: string;
  requirement?: string;
  template: GenTemplateId;
}): string {
  const isKoc = params.template === 'koc';
  return [
    isKoc
      ? '请把以下原始素材按指定模块「如实摘录」成一份汽车传播 Brief：只把素材中已有的信息原话填入对应模块，不补充、不拓展、不润色、不改写；必填模块素材没有就写「素材未提供」，选填模块素材没有则整块省略。'
      : `请根据以下素材生成一份结构化的汽车传播 Brief（模板：通用传播 Brief）。`,
    params.requirement ? `用户补充要求：${params.requirement}` : '',
    '',
    '【原始素材】',
    params.material.slice(0, 60000),
    '',
    isKoc
      ? '【必填模块行（必须依次全部输出）；# 开头为选填，仅当素材确有对应内容时才输出】'
      : '【需要输出的模块（必须依次输出全部模块行）】',
    buildModuleLines(params.template),
    '',
    '【各模块写作要求】',
    buildModuleGuides(params.template),
  ]
    .filter(Boolean)
    .join('\n');
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const send = (event: string, data: unknown): Uint8Array =>
    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    const body = (await request.json()) as {
      material?: string;
      sourceText?: string;
      requirement?: string;
      model?: string;
      temperature?: number;
      template?: GenTemplateId;
    };

    const template: GenTemplateId = body.template === 'koc' ? 'koc' : 'general';

    const material = (body.material ?? body.sourceText ?? '').trim();
    if (!material) {
      return new Response(
        JSON.stringify({ error: '请先提供素材文本（粘贴文字或上传文件）' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new LLMClient(new Config(), customHeaders);

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const tokenStream = client.stream(
            [
              { role: 'system', content: buildSystemPrompt(template) },
              {
                role: 'user',
                content: buildUserPrompt({
                  material,
                  requirement: body.requirement,
                  template,
                }),
              },
            ],
            {
              model: body.model || 'doubao-seed-2-0-pro-260215',
              temperature:
                typeof body.temperature === 'number' ? body.temperature : 0.4,
              thinking: 'disabled',
            },
          );

          for await (const chunk of tokenStream) {
            const text = chunk.content?.toString();
            if (text) {
              controller.enqueue(send('delta', { text }));
            }
          }
          controller.enqueue(send('done', { ok: true }));
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'AI 服务调用失败';
          controller.enqueue(send('error', { message }));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: '请求参数解析失败' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
