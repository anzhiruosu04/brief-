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
 * 内容约定（AI 生成 & 编辑器均使用同一套轻量块标记）：
 *  - 表格：连续以 `|` 分隔的行，首行为表头；如「六要素速览/信息总表/传播规范/制作规范/传播信息/销量资产」
 *  - 小节标题：以 `### ` 开头（如传播目标下的三个维度、观点库下的各观点）
 *  - 列表：`- ` 无序、`1. ` 有序
 *  - 其余为正文段落
 */
export const KOC_MODULES: TemplateModuleDef[] = [
  {
    key: 'sixElements',
    title: '六要素速览',
    enTitle: 'Overview',
    placeholder:
      '两列表格，固定要素行：做什么 / 什么时候 / 在哪里 / 怎么做 / 重点 / 红线。\n' +
      '| 要素 | 内容 |\n| --- | --- |\n| 做什么 | … |\n| 什么时候 | … |\n| 在哪里 | … |\n| 怎么做 | … |\n| 重点 | … |\n| 红线 | … |',
  },
  {
    key: 'infoSheet',
    title: '信息总表',
    enTitle: 'Fact Sheet',
    placeholder:
      '两列表格：传播车型 / 传播动作 / 传播定位 / 传播渠道 / 传播节点 / 核心 Slogan·话题矩阵。\n' +
      '| 项目 | 内容 |\n| --- | --- |\n| 传播车型 | … |',
  },
  {
    key: 'commRules',
    title: '传播规范',
    enTitle: 'Communication Rules',
    placeholder:
      '两列表格，左列为规范项、右列为具体要求（如强化核心认知 / 重塑技术期待 / 定调用户关怀 / 画面与封面调性）。',
  },
  {
    key: 'objectiveProduct',
    title: '传播目标 · 产品力维度',
    enTitle: 'Objective · Product',
    placeholder: '从产品力角度描述要建立的认知与价值标杆。',
  },
  {
    key: 'objectiveVoice',
    title: '传播目标 · 市场声量维度',
    enTitle: 'Objective · Voice',
    placeholder: '从市场声量、销量/排名资产角度描述目标。',
  },
  {
    key: 'objectiveMind',
    title: '传播目标 · 用户心智维度',
    enTitle: 'Objective · Mindshare',
    placeholder: '从用户心智、偏见破除、理念传递角度描述目标。',
  },
  {
    key: 'audience',
    title: '目标受众',
    enTitle: 'Target Audience',
    placeholder: '编号列出 3-5 类核心目标人群及其购车/内容偏好。',
  },
  {
    key: 'assets',
    title: '官方固定资产与产品焕新定性',
    enTitle: 'Assets & Highlights',
    placeholder:
      '先写一段总定性（绑定可引用的官方资产），再用 `### 焕新要点` 小标题 + 列表分条呈现各维度升级；如有名称/口径要求用【注意】列出。',
  },
  {
    key: 'titleExamples',
    title: '标题示例',
    enTitle: 'Title Examples',
    placeholder: '编号列出 8-16 条可直接使用/参考的内容标题。',
  },
  {
    key: 'viewpoints',
    title: '传播核心观点库与标题示例',
    enTitle: 'Key Viewpoints',
    placeholder:
      '每个观点用 `### 观点N：【视角】核心结论 【★必选】`（标签三选一：【★必选】/【★推荐】/【可选】）作为小标题，' +
      '其下用「核心论点：…」段落与「- 」列表展开，并给出「示例标题：」编号列表。',
  },
  {
    key: 'complianceRedline',
    title: '合规红线',
    enTitle: 'Compliance Redlines',
    placeholder:
      '列出绝对化用语、智能驾驶、对比竞品、车名完整、画面无竞品等红线要求。以「不得/禁止/避免 + 被引用词」或引号引用形式书写。',
    kind: 'note',
  },
  {
    key: 'wordingGuide',
    title: '口径指引',
    enTitle: 'Wording Guide',
    placeholder: '针对热点/行业事件的统一对外口径、可引用的官方数据与禁说内容。',
    kind: 'note',
  },
  {
    key: 'editGuide',
    title: '剪辑规范',
    enTitle: 'Editing Guide',
    placeholder: '两列表格：画幅 / 时长 / 字幕 / 录音质量 / 画面干净 / 花字规范 等规范项与要求。',
  },
  {
    key: 'visualGuide',
    title: '画面参考',
    enTitle: 'Visual Reference',
    placeholder: '两列表格：画面场景（车辆外观/内饰座舱/驾驶动态/智驾场景/品质验证/人物出镜）与拍摄建议。',
  },
  {
    key: 'sentimentGuide',
    title: '舆情引导话术',
    enTitle: 'Sentiment Scripts',
    placeholder: '面向老车主/舆论风向的正向引导话术，编号列出。',
  },
  {
    key: 'namingRule',
    title: '车型名称书写规范',
    enTitle: 'Naming Rules',
    placeholder: '品牌、产品、完整名称的标准写法，以及不得简写的要求（反面引用豁免）。',
    kind: 'note',
  },
  {
    key: 'hashtags',
    title: '必带话题',
    enTitle: 'Required Hashtags',
    placeholder: '列出必须携带的话题标签，每个一行（#开头）。',
  },
  {
    key: 'priority',
    title: '传播方向优先级',
    enTitle: 'Priority',
    placeholder: '两列表格：优先级（★必选/★推荐/★可选）与对应传播方向，并附组合建议。',
  },
  {
    key: 'projectInfo',
    title: '传播信息',
    enTitle: 'Campaign Info',
    placeholder:
      '两列表格：传播车型 / 起售价 / 限时权益 / 金融政策 / 传播周期 / 传播渠道 / 内容形式 / 素材包链接；未公布项用「待官方公布」。',
  },
  {
    key: 'salesAssets',
    title: '销量与品质资产',
    enTitle: 'Sales Assets',
    placeholder: '两列表格：资产项（销量排名/累计用户/全球销量/品质验证/装机验证等）与对应官方可引用数据。',
  },
];

export const KOC_TEMPLATE: BriefTemplate = {
  id: 'koc',
  name: 'KOC 种草传播 Brief',
  description: '对齐车企实际 KOC 种草版式：六要素速览、信息总表、传播规范、观点库、制作规范与资产表。',
  docTitle: '{project} KOC 传播 Brief',
  modules: KOC_MODULES,
};

export const TEMPLATES: Record<BriefTemplateId, BriefTemplate> = {
  general: GENERAL_TEMPLATE,
  koc: KOC_TEMPLATE,
};

export const DEFAULT_TEMPLATE: BriefTemplateId = 'koc';

export function getTemplate(id?: BriefTemplateId | null): BriefTemplate {
  return TEMPLATES[id ?? 'general'] ?? GENERAL_TEMPLATE;
}
