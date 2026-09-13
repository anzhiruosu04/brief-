import type {
  Brief,
  BriefModule,
  BriefModuleKey,
  BriefTemplateId,
  TemplateModuleDef,
} from './types';
import { getTemplate } from './templates';
import { uid } from './storage';

export function createModuleFromDef(def: TemplateModuleDef): BriefModule {
  return {
    id: uid('mod'),
    key: def.key,
    title: def.title,
    enTitle: def.enTitle,
    content: '',
    kind: def.kind,
    custom: false,
  };
}

export function createModule(key: BriefModuleKey, content = ''): BriefModule {
  // 在两套模板里查元信息
  const def =
    getTemplate('general').modules.find((m) => m.key === key) ??
    getTemplate('koc').modules.find((m) => m.key === key);
  return {
    id: uid('mod'),
    key,
    title: def?.title ?? key,
    enTitle: def?.enTitle ?? '',
    content,
    kind: def?.kind,
    custom: key === 'custom',
  };
}

export function createEmptyModules(template: BriefTemplateId = 'koc'): BriefModule[] {
  // 仅实例化必填模块；选填模块（optional）由 AI 生成或用户手动添加
  return getTemplate(template)
    .modules.filter((m) => !m.optional)
    .map((m) => createModuleFromDef(m));
}

export function createBrief(partial?: Partial<Brief>): Brief {
  const now = Date.now();
  // 新建默认使用 KOC 种草模板；历史数据无 template 字段时按通用模板渲染
  const template: BriefTemplateId = partial?.template ?? 'koc';
  return {
    id: uid('brief'),
    title: partial?.title ?? '未命名 Brief',
    project: partial?.project ?? '',
    template,
    modules: partial?.modules ?? createEmptyModules(template),
    sourceText: partial?.sourceText ?? '',
    sourceName: partial?.sourceName,
    riskLevel: 'none',
    issueCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    tags: partial?.tags ?? [],
    createdAt: partial?.createdAt ?? now,
    updatedAt: partial?.updatedAt ?? now,
  };
}
