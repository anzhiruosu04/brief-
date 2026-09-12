import { NextRequest, NextResponse } from 'next/server';
import { Config, HeaderUtils, LLMClient } from 'coze-coding-dev-sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface PolishItem {
  word: string;
  suggestion: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      text?: string;
      items?: PolishItem[];
      model?: string;
      temperature?: number;
    };
    if (!body.text?.trim() || !body.items?.length) {
      return NextResponse.json({ error: '缺少待优化文案或违禁词' }, { status: 400 });
    }

    const client = new LLMClient(
      new Config(),
      HeaderUtils.extractForwardHeaders(request.headers),
    );

    const wordList = body.items.map((i) => `「${i.word}」（系统建议：${i.suggestion}）`).join('、');
    const prompt = `你是汽车行业广告合规文案编辑。请改写下面这段文案中的违禁/风险表述，要求：
1. 仅替换给定风险词及其连带句式，保持原文结构、口吻与信息量不变；
2. 数据类内容不得编造，拿不准的保留原意并加【待确认】；
3. 直接输出改写后的完整文案，不要解释、不要前后缀。
需要处理的风险词：${wordList}

【原文】
${body.text.slice(0, 20000)}`;

    const response = await client.invoke(
      [{ role: 'user', content: prompt }],
      {
        model: body.model || 'doubao-seed-2-0-pro-260215',
        temperature:
          typeof body.temperature === 'number' ? body.temperature : 0.2,
        thinking: 'disabled',
      },
    );

    return NextResponse.json({ text: response.content ?? '' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI 改写失败';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
