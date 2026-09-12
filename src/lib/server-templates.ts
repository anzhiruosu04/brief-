/**
 * 服务端 AI 生成用的模板规格（与 client 的 templates.ts 保持同一套 key）。
 * 只放「给模型看的指令」，避免 route.ts 直接依赖带 uid 等 client 工具的模块。
 */

export type GenTemplateId = 'general' | 'koc';

export interface GenModuleSpec {
  key: string;
  title: string;
  /** 该模块的生成指令 */
  guide: string;
  kind?: 'rich' | 'note';
}

const COMPLIANCE =
  '严禁《广告法》绝对化用语（如“最、第一、首选、首选车型、顶级、国家级、销量冠军、唯一、领导者”等，除非素材明确给出可引用的官方排名并标注统计口径与时间段；示例标题中也不得出现“XX万级首选/第一”这类排他表述）；' +
  '严禁把辅助驾驶表述为“自动驾驶/无人驾驶/完全自动”，统一用“组合驾驶辅助/辅助驾驶（L2）”并提示驾驶员需全程接管；' +
  '续航/油耗/加速/功率等数据须加“约/WLTC·CLTC工况/以官方公告为准”等限定；不编造数字，素材没有的信息用【待官方确认】或“待补充”，不要臆造。';

const BLOCK_FORMAT =
  '模块正文使用轻量标记（不要用 ``` 代码块）：\n' +
  '- 需要表格的模块：用 Markdown 表格，首行表头、第二行写 |---|---|，如\n' +
  '  | 要素 | 内容 |\n  | --- | --- |\n  | 做什么 | … |\n' +
  '- 模块内需要分层小标题时，用「### 小标题」单独成行（例如传播目标的三个维度、观点库的每个观点）；\n' +
  '- 并列要点用「- 」无序列表，需要排序时用「1. 」有序列表；其余为普通段落，每行不要过长。';

const GENERAL_MODULES: GenModuleSpec[] = [
  { key: 'background', title: '项目背景', guide: '品牌/车型背景、传播缘起、市场环境，2-3 句' },
  { key: 'objective', title: '传播目标', guide: '认知/态度/行为层面的具体目标，分条' },
  { key: 'audience', title: '目标人群', guide: '人群画像、用车场景、核心洞察，编号列出 3-4 类' },
  { key: 'sellingPoints', title: '核心卖点', guide: '3-5 条核心卖点，无序列表，参数需合规限定' },
  { key: 'keyMessage', title: '核心信息', guide: '主传播口号与信息屋（主信息+支撑点），口径合规' },
  { key: 'deliverables', title: '内容交付物', guide: '短视频/海报/KOL软文/新闻稿等形式与数量，可列表' },
  { key: 'channels', title: '传播渠道', guide: '媒体平台与渠道组合，可分重点/辐射' },
  { key: 'timeline', title: '时间排期', guide: '预热/爆发/长尾阶段与节点，素材缺失写待确认' },
  { key: 'budget', title: '预算范围', guide: '预算区间或分配建议，素材没有则写【待官方确认】' },
  { key: 'kpi', title: '效果评估', guide: '曝光/互动/线索等可量化指标，分条' },
  {
    key: 'notes',
    title: '备注与合规要求',
    kind: 'note',
    guide: '用“风险类别 + 审核要求”写法务/品牌口径（如：避免绝对化用语；数据须标注来源与统计口径；辅助驾驶不得描述为自动驾驶）。如确需引用被禁止的具体词做反面提醒，必须放在引号内并紧跟“不得/禁止/避免”，例如：不得使用“自动驾驶”表述。',
  },
];

const KOC_MODULES: GenModuleSpec[] = [
  {
    key: 'sixElements',
    title: '六要素速览',
    guide:
      '输出一个两列表格，表头「要素 | 内容」，固定 6 行：做什么 / 什么时候 / 在哪里 / 怎么做 / 重点 / 红线。内容高度凝练，红线一行概括合规与竞品禁区。',
  },
  {
    key: 'infoSheet',
    title: '信息总表',
    guide:
      '输出两列表格，表头「项目 | 内容」，行包含：传播车型、传播动作、传播定位、传播渠道、传播节点、核心Slogan/话题矩阵。话题矩阵一行内用空格分隔多个 #话题。',
  },
  {
    key: 'commRules',
    title: '传播规范',
    guide: '输出两列表格，表头「规范项 | 具体要求」，按素材概括 3-5 条内容创作总规范（如强化核心认知、技术期待、用户关怀、画面封面调性）。',
  },
  { key: 'objectiveProduct', title: '传播目标 · 产品力维度', guide: '从产品力角度写 1 段，说明要展示的实力与要树立的价值标杆。' },
  { key: 'objectiveVoice', title: '传播目标 · 市场声量维度', guide: '从市场声量与可引用官方资产角度写 1 段；排名类表述必须标注时间段与统计口径。' },
  { key: 'objectiveMind', title: '传播目标 · 用户心智维度', guide: '从用户心智、偏见破除、理念传递角度写 1 段。' },
  { key: 'audience', title: '目标受众', guide: '有序列表列出 3-5 类核心目标人群及其购车/内容偏好。' },
  {
    key: 'assets',
    title: '官方固定资产与产品焕新定性',
    guide:
      '先用 1 段做总定性（仅绑定素材中可引用的官方资产/数据，并标注口径）；另起一行「### 焕新要点」，再用无序列表分维度（如造型/驾控/智能/舒适/安全）列出升级点，参数合规限定；如素材规定了车型名称/口径，用「【注意】…」单独一段列出。',
  },
  { key: 'titleExamples', title: '标题示例', guide: '有序列表给出 8-12 条可直接参考的内容标题，标题本身也必须合规，不使用绝对化用语。' },
  {
    key: 'viewpoints',
    title: '传播核心观点库与标题示例',
    guide:
      '按素材归纳 3-6 个传播观点。每个观点用单独一行小标题，严格采用格式「### 观点N：【XX视角】+ 一句话核心结论（空格）【★必选】」（【XX视角】后必须写出该观点的核心结论短语，不要只写视角名或优先级词；结尾标签二选一：【★必选】/【★推荐】/【可选】，标签只出现一次，正文里不要再重复“必选/推荐/可选”字样）。优先级与素材一致：素材标必选才用【★必选】，标推荐用【★推荐】，标可选用【可选】；素材未标注时合理分配为 1 个必选、其余推荐/可选，不得全部必选。示例：### 观点一：【架控视角】动力强还省油，告别肉车与油老虎 【★必选】。小标题下先用「核心论点：」写 1 段，再用无序列表补充论据，最后用「示例标题：」另起并有序列出 2-3 条标题；标题禁止“首选/第一/最高/最好”等排他词。',
  },
  {
    key: 'complianceRedline',
    title: '合规红线',
    kind: 'note',
    guide: '无序列表列出红线：绝对化用语、智能驾驶表述、竞品对比、车名完整、画面无竞品信息等。引用被禁止的词时必须放在引号内并紧跟“不得/禁止/避免”，如：不得将辅助驾驶称为“自动驾驶”。',
  },
  {
    key: 'wordingGuide',
    title: '口径指引',
    kind: 'note',
    guide: '针对热点/行业事件给统一对外口径、可引用的官方数据与禁说内容；引用风险词须加引号并以“不得/避免”引导。素材没有相关内容时，给出通用审慎口径并标注【按本项目实际调整】。',
  },
  {
    key: 'editGuide',
    title: '剪辑规范',
    guide: '输出两列表格，表头「规范项 | 要求」，涵盖画幅、时长、字幕、录音质量、画面干净、花字规范等（素材缺失项给出行业常规建议）。',
  },
  {
    key: 'visualGuide',
    title: '画面参考',
    guide: '输出两列表格，表头「画面场景 | 拍摄建议」，涵盖车辆外观、内饰座舱、驾驶动态、智驾场景（需标注辅助驾驶非自动驾驶）、品质验证、人物出镜等。',
  },
  { key: 'sentimentGuide', title: '舆情引导话术', guide: '有序列表给出面向老车主/舆论风向的正向引导话术 2-4 条。' },
  {
    key: 'namingRule',
    title: '车型名称书写规范',
    kind: 'note',
    guide: '用列表写清品牌、产品、完整名称的标准写法；对不得使用的简写，放在引号内并以“不得简写为/禁止使用”引导。素材未规定时给出通用占位。',
  },
  { key: 'hashtags', title: '必带话题', guide: '无序列表逐行列出必带话题（#开头）；素材没有则依据车型与主题拟 3-5 个合规话题并标注【建议，以实际为准】。' },
  {
    key: 'priority',
    title: '传播方向优先级',
    guide: '输出两列表格，表头「优先级 | 方向」，行用 ★必选/★推荐/可选 对应传播方向；表后用一句话说明组合建议。',
  },
  {
    key: 'projectInfo',
    title: '传播信息',
    guide: '输出两列表格，表头「项目 | 内容」，含传播车型、起售价、限时权益、金融政策、传播周期、传播渠道、内容形式、素材包链接；未公布项填“待官方公布/待补充”，不得编造价格权益。',
  },
  {
    key: 'salesAssets',
    title: '销量与品质资产',
    guide: '输出两列表格，表头「资产项 | 数据」，仅填素材中给出的官方可引用资产（销量排名/累计用户/全球销量/品质验证/装机验证等），并保留统计口径与时间段；素材没有的行填“以官方口径为准”，不要编造。',
  },
];

export const GEN_TEMPLATES: Record<GenTemplateId, { modules: GenModuleSpec[]; format: string }> = {
  general: { modules: GENERAL_MODULES, format: '模块正文用 Markdown：清单用无序列表，长段落不超过 3 句。' },
  koc: { modules: KOC_MODULES, format: BLOCK_FORMAT },
};

export function buildSystemPrompt(template: GenTemplateId): string {
  const spec = GEN_TEMPLATES[template] ?? GEN_TEMPLATES.general;
  const keys = spec.modules.map((m) => m.key).join('、');
  return `你是资深汽车行业品牌传播策略专家，长期服务车企市场部与 KOC/KOL 内容代理，擅长把零散素材整理成可直接执行的传播 Brief。
输出必须严格遵守：
0. 在所有模块行之前，先单独输出一行标题标记：<<<TITLE:根据车型/项目拟定的 Brief 标题（10-24 字，不要书名号）>>>，且整篇只出现一次。
1. 只输出“标题行 + 模块行 + 正文”。模块行格式为 <<<MODULE:key|模块名>>>，独占一行；正文紧随其后，直到下一个模块行。
2. 必须且只能依次输出这些 key：${keys}。每个 key 都要输出模块行；某模块素材不足时，正文给出合规占位（如【待官方确认】/待补充）而不是省略该模块。
3. ${spec.format}
4. 内容专业、具体、可执行，忠实于素材，不添加素材之外的承诺与数据。
5. ${COMPLIANCE}
6. 不要输出任何解释、寒暄、代码块围栏或模块以外的内容。`;
}

export function buildModuleLines(template: GenTemplateId): string {
  const spec = GEN_TEMPLATES[template] ?? GEN_TEMPLATES.general;
  return spec.modules.map((m) => `<<<MODULE:${m.key}|${m.title}>>>`).join('\n');
}

export function buildModuleGuides(template: GenTemplateId): string {
  const spec = GEN_TEMPLATES[template] ?? GEN_TEMPLATES.general;
  return spec.modules.map((m) => `- ${m.key}（${m.title}）：${m.guide}`).join('\n');
}
