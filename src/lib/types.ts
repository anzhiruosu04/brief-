// 全局类型定义

export type RiskLevel = 'high' | 'medium' | 'low';

export type WordScope = '通用' | '汽车行业';

/** 违禁词条目 */
export interface ForbiddenWord {
  id: string;
  /** 违禁词语 */
  word: string;
  /** 分类 */
  category: string;
  /** 风险等级 */
  level: RiskLevel;
  /** 风险说明 */
  reason: string;
  /** 替换建议 */
  suggestion: string;
  /** 适用范围 */
  scope: WordScope;
  /** 是否内置词库 */
  builtin: boolean;
}

/** 词库分片元组：[词语, 分类, 等级, 风险说明, 替换建议, 范围(0=通用 1=汽车行业)] */
export type WordTuple = [string, string, RiskLevel, string, string, 0 | 1];

/** Brief 模板 ID：general=通用 11 模块；koc=KOC 种草传播 Brief（参考车企实际版式） */
export type BriefTemplateId = 'general' | 'koc';

/** 模块渲染形态：默认富文本块（支持表格/小标题/列表）；note=合规备注（扫描豁免反面引用） */
export type BriefModuleKind = 'rich' | 'note';

/** Brief 模块 */
export interface BriefModule {
  id: string;
  key: BriefModuleKey;
  title: string;
  enTitle: string;
  content: string;
  /** 是否为 AI 生成后允许用户增删的附加模块 */
  custom?: boolean;
  /** 模块形态，默认 rich */
  kind?: BriefModuleKind;
}

export type BriefModuleKey =
  // 通用模板
  | 'background'
  | 'objective'
  | 'audience'
  | 'sellingPoints'
  | 'keyMessage'
  | 'deliverables'
  | 'channels'
  | 'timeline'
  | 'budget'
  | 'kpi'
  | 'notes'
  // KOC 种草模板
  | 'sixElements'
  | 'infoSheet'
  | 'commRules'
  | 'objectiveProduct'
  | 'objectiveVoice'
  | 'objectiveMind'
  | 'assets'
  | 'titleExamples'
  | 'viewpoints'
  | 'complianceRedline'
  | 'wordingGuide'
  | 'editGuide'
  | 'visualGuide'
  | 'sentimentGuide'
  | 'namingRule'
  | 'hashtags'
  | 'priority'
  | 'projectInfo'
  | 'salesAssets'
  | 'productInfo'
  | 'custom';

/** 单个模板的模块定义 */
export interface TemplateModuleDef {
  key: BriefModuleKey;
  title: string;
  enTitle: string;
  placeholder: string;
  kind?: BriefModuleKind;
  /** 选填模块：素材无对应内容时不生成、不在默认结构中强制占位 */
  optional?: boolean;
}

export interface BriefTemplate {
  id: BriefTemplateId;
  name: string;
  description: string;
  /** 文档标题默认格式（{project} 占位） */
  docTitle: string;
  modules: TemplateModuleDef[];
}

export const MODULE_META: TemplateModuleDef[] = [
  { key: 'background', title: '项目背景', enTitle: 'Background', placeholder: '简述品牌/车型背景、传播缘起与市场环境' },
  { key: 'objective', title: '传播目标', enTitle: 'Objective', placeholder: '本次传播要达成的认知、态度或行为目标' },
  { key: 'audience', title: '目标人群', enTitle: 'Target Audience', placeholder: '人群画像、使用场景、核心洞察' },
  { key: 'sellingPoints', title: '核心卖点', enTitle: 'Key Selling Points', placeholder: '产品核心卖点，建议分条列出' },
  { key: 'keyMessage', title: '核心信息', enTitle: 'Key Message', placeholder: '主传播口号 / 核心信息屋（需合规表述）' },
  { key: 'deliverables', title: '内容交付物', enTitle: 'Deliverables', placeholder: '如 TVC、海报、KOL 软文、新闻稿等' },
  { key: 'channels', title: '传播渠道', enTitle: 'Channels', placeholder: '投放平台与渠道组合' },
  { key: 'timeline', title: '时间排期', enTitle: 'Timeline', placeholder: '预热 / 爆发 / 长尾各阶段时间节点' },
  { key: 'budget', title: '预算范围', enTitle: 'Budget', placeholder: '预算区间或分配方式' },
  { key: 'kpi', title: '效果评估', enTitle: 'KPI', placeholder: '曝光、互动、线索等可量化指标' },
  { key: 'notes', title: '备注与合规要求', enTitle: 'Notes & Compliance', placeholder: '其他注意事项、法务/品牌口径要求', kind: 'note' },
];

/** Brief 主对象 */
export interface Brief {
  id: string;
  title: string;
  /** 关联车型 / 项目名 */
  project: string;
  /** 使用的模板，旧数据缺省为 general */
  template?: BriefTemplateId;
  modules: BriefModule[];
  /** 原始素材文本 */
  sourceText: string;
  sourceName?: string;
  /** 整体风险状态 */
  riskLevel: 'none' | RiskLevel;
  /** 未解决的命中数量 */
  issueCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

/** 设置 */
export interface AppSettings {
  feishuAppId: string;
  feishuAppSecret: string;
  /** AI 模型 ID */
  aiModel: string;
  /** 温度 */
  aiTemperature: number;
  /** 扫描范围：是否同时扫描自定义词库 */
  includeCustomWords: boolean;
}

/** 扫描命中 */
export interface ScanHit {
  wordId: string;
  word: string;
  category: string;
  level: RiskLevel;
  reason: string;
  suggestion: string;
  scope: WordScope;
  /** 在文本中的起始位置 */
  start: number;
  end: number;
  /** 命中序号（同词多次出现分别编号） */
  occurrence: number;
  /** 多模块扫描时所属模块 id */
  moduleId?: string;
}

/** 扫描结果 */
export interface ScanResult {
  hits: ScanHit[];
  highCount: number;
  mediumCount: number;
  lowCount: number;
  total: number;
}
