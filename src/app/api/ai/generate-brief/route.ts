import { NextRequest } from 'next/server';
import { Config, HeaderUtils, LLMClient } from 'coze-coding-dev-sdk';

export const runtime = 'nodejs';
export const maxDuration = 120;

const MODULE_INSTRUCTIONS = [
  'background|项目背景：品牌/车型背景、传播缘起、市场环境',
  'objective|传播目标：认知/态度/行为层面的具体目标',
  'audience|目标人群：人群画像、用车场景、核心洞察',
  'sellingPoints|核心卖点：3-5 条产品核心卖点，分条列出',
  'keyMessage|核心信息：主传播口号与信息屋，口径必须合规',
  'deliverables|内容交付物：TVC/海报/KOL/新闻稿等形式与数量',
  'channels|传播渠道：媒体平台与渠道组合',
  'timeline|时间排期：预热/爆发/长尾的阶段安排',
  'budget|预算范围：预算区间或分配建议',
  'kpi|效果评估：曝光、互动、线索等可量化指标',
  'notes|备注与合规要求：用"类别+要求"写法务口径与禁用表述提醒，不罗列具体禁用词',
];

const SYSTEM_PROMPT = `你是资深的汽车行业品牌传播策略专家，长期服务车企市场部与公关代理，擅长把零散素材整理成专业的传播 Brief。
输出必须严格遵守：
1. 只输出“模块行 + 正文”，模块行格式为 <<<MODULE:key|模块名>>>，正文紧随其后，直到下一个模块行；
2. 必须依次输出这些 key：${MODULE_INSTRUCTIONS.map((m) => m.split('|')[0]).join('、')}；
3. 正文使用 Markdown，多卖点/清单用无序列表，长段落控制在 3 句以内，整体专业、具体、可执行；
4. 严禁使用《广告法》绝对化用语（如“最、第一、顶级、国家级、唯一、销量冠军”等），严禁把辅助驾驶表述为“自动驾驶/无人驾驶”，严禁承诺“零风险、零自燃、永不衰减”等，续航/油耗/加速等数据必须用“约/官方工况/需以官方公告为准”等限定，不编造具体数字，拿不准的数字用占位符【待官方确认】；
5. 「备注与合规要求」模块用"风险类别 + 审核要求"表述（如"避免绝对化用语""数据须标注来源与统计口径""辅助驾驶不得描述为自动驾驶"），不要原样引用/罗列具体禁用词；
6. 不要输出任何解释、寒暄、代码块标记或模块以外的内容。`;

function buildUserPrompt(params: {
  material: string;
  requirement?: string;
}): string {
  return [
    `请根据以下素材生成一份结构化的汽车传播 Brief。`,
    params.requirement ? `用户补充要求：${params.requirement}` : '',
    '',
    '【原始素材】',
    params.material.slice(0, 60000),
    '',
    '【输出要求】',
    MODULE_INSTRUCTIONS.map((m) => {
      const [key, desc] = m.split('|');
      return `<<<MODULE:${key}|${desc.split('：')[0]}>>>`;
    }).join('\n'),
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
    };

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
              { role: 'system', content: SYSTEM_PROMPT },
              {
                role: 'user',
                content: buildUserPrompt({
                  material,
                  requirement: body.requirement,
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
