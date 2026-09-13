import type { BriefTemplate, BriefTemplateId, TemplateModuleDef } from './types';

/** 通用 11 模块模板（原默认） */
export const GENERAL_TEMPLATE: BriefTemplate = {
  id: 'general',
  name: '通用传播 Brief',
  description: '背景/目标/人群/卖点/交付物/渠道/排期/预算/KPI/合规，适合常规公关与整合传播。',
  docTitle: '{project} 传播 Brief',
  modules: [
    { key: 'background', title: '项目背景', enTitle: 'Background', placeholder: '简述品牌/车型背景、传播缘起与市场环境' },
    { key: 'objective', title: '传播目标', enTitle: 'Objective', placeholder: '本次传播要达成的认知、态度或行为目标' },
    { key: 'audience', title: '目标人群', enTitle: 'Target Audience', placeholder: '人群画像、使用场景、核心洞察' },
    { key: 'sellingPoints', title: '核心卖点', enTitle: 'Key Selling Points', placeholder: '产品核心卖点，建议分条列出' },
    { key: 'keyMessage', title: '核心信息', enTitle: 'Key Message', placeholder: '主传播口号 / 核心信息屋（需合规表述）' },
    { key: 'deliverables', title: '内容交付物', enTitle: 'Deliverables', placeholder: '如短视频、海报、KOL 软文、新闻稿等' },
    { key: 'channels', title: '传播渠道', enTitle: 'Channels', placeholder: '投放平台与渠道组合' },
    { key: 'timeline', title: '时间排期', enTitle: 'Timeline', placeholder: '预热 / 爆发 / 长尾各阶段时间节点' },
    { key: 'budget', title: '预算范围', enTitle: 'Budget', placeholder: '预算区间或分配方式' },
    { key: 'kpi', title: '效果评估', enTitle: 'KPI', placeholder: '曝光、互动、线索等可量化指标' },
    { key: 'notes', title: '备注与合规要求', enTitle: 'Notes & Compliance', placeholder: '其他注意事项、法务/品牌口径要求', kind: 'note' },
  ],
};

/**
 * KOC 种草传播 Brief 模板（对齐车企实际 Brief 版式）
 *
 * 核心原则：**如实填充，不做补充**。所有内容仅从原始素材中摘录、原话粘贴，
 * 不额外撰写、润色、改写或脑补；素材没有的信息填「素材未提供」，不编造。
 *
 * 必填 7 项：六要素速览 / 信息总表 / 传播规范（基本要求·剪辑·画面·口径）/
 *           传播目标 / 目标受众 / 传播内容 / 标题实例
 * 选填 2 项：传播核心观点库 / 产品信息附件（仅当素材确有对应内容时才生成）
 *
 * 内容约定（AI 生成 & 编辑器均使用同一套轻量块标记）：
 *  - 表格：连续以 `|` 分隔的行，首行为表头（六要素速览 / 信息总表 / 传播规范）
 *  - 小节标题：以 `### ` 开头（如传播规范下的四个子项、传播目标下的维度）
 *  - 列表：`- ` 无序、`1. ` 有序
 *  - 其余为正文段落
 */
export const KOC_MODULES: TemplateModuleDef[] = [
  {
    key: 'sixElements',
    title: '六要素参考',
    enTitle: 'Overview',
    placeholder:
      '仅如实摘录素材，原话粘贴，不补充。两列表格，固定要素行：做什么 / 什么时候 / 在哪里 / 怎么做 / 重点 / 红线。\n' +
      '| 要素 | 内容 |\n| --- | --- |\n| 做什么 | … |\n| 什么时候 | … |\n| 在哪里 | … |\n| 怎么做 | … |\n| 重点 | … |\n| 红线 | … |\n' +
      '素材未提及的行填「素材未提供」。',
  },
  {
    key: 'infoSheet',
    title: '信息总表',
    enTitle: 'Fact Sheet',
    placeholder:
      '仅如实摘录素材，原话粘贴。两列表格：传播车型 / 传播动作 / 传播定位 / 传播渠道 / 传播节点 / 核心 Slogan·话题矩阵。\n' +
      '| 项目 | 内容 |\n| --- | --- |\n| 传播车型 | … |\n素材未提及的行填「素材未提供」。',
  },
  {
    key: 'commRules',
    title: '传播规范',
    enTitle: 'Communication Rules',
    placeholder:
      '仅如实摘录素材，原话粘贴。含四个子项，分别以小标题呈现，子项内可用两列表格或列表：\n' +
      '### 传播基本要求\n### 剪辑\n### 画面\n### 口径\n' +
      '素材未提及的子项填「素材未提供」。',
  },
  {
    key: 'objective',
    title: '传播目标',
    enTitle: 'Objective',
    placeholder:
      '仅如实摘录素材中写明的传播目标，原话粘贴；可按产品力 / 市场声量 / 用户心智等素材已有的维度用 `### ` 分节。' +
      '素材未写明的维度填「素材未提供」，不自行发挥。',
  },
  {
    key: 'audience',
    title: '目标受众',
    enTitle: 'Target Audience',
    placeholder: '仅如实摘录素材中写明的目标人群及其描述，原话粘贴、编号列出；素材未提供填「素材未提供」。',
  },
  {
    key: 'keyMessage',
    title: '传播内容',
    enTitle: 'Key Message',
    placeholder:
      '仅如实摘录素材中要求传播的核心信息 / Slogan / 信息点，原话粘贴，不重新组织或润色；素材未提供填「素材未提供」。',
  },
  {
    key: 'titleExamples',
    title: '标题实例',
    enTitle: 'Title Examples',
    placeholder: '仅原样罗列素材中给出的标题实例，编号列出，不改写、不新增；素材未提供填「素材未提供」。',
  },
  {
    key: 'viewpoints',
    title: '传播核心观点库',
    enTitle: 'Key Viewpoints',
    optional: true,
    placeholder:
      '【选填】仅当素材明确给出观点时才填，原话摘录。每个观点用 `### 观点N：【视角】核心结论 【★必选】`' +
      '（标签三选一：【★必选】/【★推荐】/【可选】）作为小标题，其下用「核心论点：…」段落与「- 」列表展开。素材没有观点则整块省略。',
  },
  {
    key: 'productInfo',
    title: '产品信息附件',
    enTitle: 'Product Info',
    optional: true,
    placeholder:
      '【选填】仅当素材包含产品参数 / 配置 / 价格 / 资料附件等信息时才填，用两列表格或列表原样罗列；素材没有则整块省略。',
  },
];

export const KOC_TEMPLATE: BriefTemplate = {
  id: 'koc',
  name: 'KOC 种草传播 Brief',
  description: '如实摘录素材：六要素参考、信息总表、传播规范（基本要求·剪辑·画面·口径）、目标与内容、标题实例；观点库与产品信息附件选填。',
  docTitle: '{project} 传播 Brief',
  modules: KOC_MODULES,
};

/**
 * Joey Brief 模板（60s 坐播口播 · 导购向，对齐《吉利银河TT 坐播传播 Brief》版式）
 *
 * 与 KOC 同样坚持「如实摘录、原话粘贴、不补充不润色不脑补」。
 *
 * 必填 7 项：六要素速览 / 信息总表 / 传播规范 / 传播目标（产品力·市场声量·用户心智三维度）/
 *           目标受众 / 官方固定资产与五大旗舰标准定性（含「版型与价格」多列表格）/ 注意事项
 * 选填 1 项：传播核心观点库与标题示例（仅当素材确有观点/标题时生成）
 */
export const JOEY_MODULES: TemplateModuleDef[] = [
  {
    key: 'sixElements',
    title: '六要素速览',
    enTitle: 'Overview',
    placeholder:
      '仅如实摘录素材，原话粘贴。两列表格，固定要素行：做什么 / 什么时候 / 在哪里 / 怎么做 / 重点 / 红线。\n' +
      '| 要素 | 内容 |\n| --- | --- |\n| 做什么 | … |\n| 什么时候 | … |\n| 在哪里 | … |\n| 怎么做 | … |\n| 重点 | … |\n| 红线 | … |\n' +
      '素材未提及的行填「素材未提供」。',
  },
  {
    key: 'infoSheet',
    title: '信息总表',
    enTitle: 'Fact Sheet',
    placeholder:
      '仅如实摘录素材，原话粘贴。两列表格：传播车型 / 传播动作（如坐播口播脚本·60s 导购向）/ 传播定位 / 传播渠道（可含参考达人）/ 传播节点 / 核心标签词。\n' +
      '| 项目 | 内容 |\n| --- | --- |\n素材未提及的行填「素材未提供」。',
  },
  {
    key: 'commRules',
    title: '传播规范',
    enTitle: 'Communication Rules',
    placeholder:
      '仅如实摘录素材中对内容/导购/画面/口径的规范要求，原话粘贴。用两列表格：左列为规范要点名（如价格诚意优先 / 导购为主体 / 级别差异不点名 / 引导线下 / 画面与封面），右列为具体要求。\n' +
      '| 规范要点 | 要求 |\n| --- | --- |\n素材未提供填「素材未提供」。',
  },
  {
    key: 'objective',
    title: '传播目标',
    enTitle: 'Objective',
    placeholder:
      '仅如实摘录素材，用三个固定维度小标题分节，原话粘贴，缺失维度填「素材未提供」：\n' +
      '### 产品力维度\n### 市场声量维度\n### 用户心智维度\n',
  },
  {
    key: 'audience',
    title: '目标受众',
    enTitle: 'Target Audience',
    placeholder: '仅如实摘录素材中写明的目标人群，原话粘贴、用 `1. 2. 3.` 编号列出；素材未提供填「素材未提供」。',
  },
  {
    key: 'assets',
    title: '官方固定资产与五大旗舰标准定性',
    enTitle: 'Official Assets',
    placeholder:
      '仅如实摘录素材。先用段落写明需高频绑定的品牌主张与车名书写注意；再用小标题与列表呈现「五大旗舰级新标准」；' +
      '版型与价格必须用多列表格（列：版型 / 价格 / 续航 / 动力 / 关键差异），原样罗列：\n' +
      '### 五大旗舰级新标准\n- 豪华质感\n- 三电系统 —— …\n\n### 版型与价格（官方口径）\n' +
      '| 版型 | 限时先享价 | 续航 | 动力 | 关键差异 |\n| --- | --- | --- | --- | --- |\n' +
      '| 640 后驱尊享版 | 12.99万 | 640km | 后驱333马力 | … |\n' +
      '素材未提供的部分填「素材未提供」，不编造配置与价格。',
  },
  {
    key: 'viewpoints',
    title: '传播核心观点库与标题示例',
    enTitle: 'Viewpoints & Titles',
    optional: true,
    placeholder:
      '【选填】仅当素材给出观点时才填，原话摘录。每个观点用 `### 观点N【视角】核心结论 【★必选】`' +
      '（标签三选一：【★必选】/【★推荐】/【可选】）作小标题，其下写「核心论点：…」段落与「示例标题：」后的 `- 《标题》` 列表。素材没有观点则整块省略。',
  },
  {
    key: 'notes',
    title: '注意事项',
    enTitle: 'Notes',
    kind: 'note',
    placeholder:
      '仅如实摘录素材中的合规与口径注意事项，原话粘贴，用小标题 + 列表/表格：\n' +
      '### 合规要求\n- 不点名竞品、不拉踩、无绝对化用语、辅助驾驶≠自动驾驶 等\n' +
      '### 数据口径\n### 车型名称书写规范\n' +
      '### 竞品对比（内部素材，脚本不点名）\n可用 4 列表格：| 维度 | 本品 | 同级常见做法 | 脚本话术方向 |\n' +
      '### 传播信息\n### 热销资产\n素材未提供的子项填「素材未提供」。',
  },
];

export const JOEY_TEMPLATE: BriefTemplate = {
  id: 'joey',
  name: 'Joey Brief（坐播导购）',
  description: '60s 坐播口播·导购向：六要素速览、信息总表、传播规范、三维度目标、受众、官方固定资产与版型价格表、观点库选填、注意事项。',
  docTitle: '{project} 坐播传播 Brief',
  modules: JOEY_MODULES,
};

export const TEMPLATES: Record<BriefTemplateId, BriefTemplate> = {
  general: GENERAL_TEMPLATE,
  koc: KOC_TEMPLATE,
  joey: JOEY_TEMPLATE,
};

export const DEFAULT_TEMPLATE: BriefTemplateId = 'koc';

export function getTemplate(id?: BriefTemplateId | null): BriefTemplate {
  return TEMPLATES[id ?? 'general'] ?? GENERAL_TEMPLATE;
}
