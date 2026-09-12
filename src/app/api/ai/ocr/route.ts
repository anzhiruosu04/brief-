import { NextRequest, NextResponse } from 'next/server';
import { Config, HeaderUtils, LLMClient } from 'coze-coding-dev-sdk';

export const runtime = 'nodejs';
export const maxDuration = 90;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      image?: string;
      model?: string;
    };
    if (!body.image?.startsWith('data:image/')) {
      return NextResponse.json(
        { error: '图片数据格式不正确（需 data URI）' },
        { status: 400 },
      );
    }

    const client = new LLMClient(
      new Config(),
      HeaderUtils.extractForwardHeaders(request.headers),
    );

    const response = await client.invoke(
      [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请对这张图片做 OCR：逐行识别其中的全部中文、英文与数字文本，保留原有的段落与换行结构，仅输出识别出的文本内容，不要添加任何解释、点评或省略。若图片中没有可识别文本，输出“未识别到文本”。',
            },
            {
              type: 'image_url',
              image_url: { url: body.image, detail: 'high' },
            },
          ],
        },
      ],
      {
        model: body.model || 'doubao-seed-2-0-pro-260215',
        temperature: 0.1,
        thinking: 'disabled',
      },
    );

    return NextResponse.json({ text: (response.content ?? '').trim() });
  } catch (error) {
    const message = error instanceof Error ? error.message : '图片识别失败';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
