import { Config, HeaderUtils, LLMClient } from 'coze-coding-dev-sdk';
import {
  buildReviewSystemPrompt,
  buildReviewUserPrompt,
} from '@/lib/server-review';

export const runtime = 'nodejs';
export const maxDuration = 120;

const encoder = new TextEncoder();
const send = (event: string, data: unknown) =>
  encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      brief?: string;
      draft?: string;
      model?: string;
      temperature?: number;
    };

    const brief = body.brief?.trim() ?? '';
    const draft = body.draft?.trim() ?? '';
    if (!brief) {
      return new Response(
        JSON.stringify({ error: '请先提供 Brief 基准文档' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (!draft) {
      return new Response(
        JSON.stringify({ error: '请先提供待审核草稿' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const client = new LLMClient(
      new Config(),
      HeaderUtils.extractForwardHeaders(request.headers),
    );

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const streamResp = await client.stream(
            [
              { role: 'system', content: buildReviewSystemPrompt() },
              {
                role: 'user',
                content: buildReviewUserPrompt(
                  brief.slice(0, 40000),
                  draft.slice(0, 20000),
                ),
              },
            ],
            {
              model: body.model || 'doubao-seed-2-0-pro-260215',
              temperature:
                typeof body.temperature === 'number' ? body.temperature : 0.1,
              thinking: 'disabled',
            },
          );

          for await (const chunk of streamResp) {
            const text = chunk.content?.toString();
            if (text) controller.enqueue(send('delta', { text }));
          }
          controller.enqueue(send('done', { ok: true }));
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'AI 对照审核失败';
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
