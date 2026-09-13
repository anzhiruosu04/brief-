# Brief 智能工作台

面向车企市场/公关传播岗的浏览器端工作台：从原始素材（粘贴文字 / docx / pdf / txt / 飞书文档 / 图片 OCR）AI 生成结构化传播 Brief，支持模块化在线编辑、违禁词实时扫描高亮与替换建议，并可导出 Word（.docx）。

## 技术栈

- Next.js 16（App Router）+ React 19 + TypeScript 5（strict）
- shadcn/ui（Radix UI）+ Tailwind CSS 4
- `coze-coding-dev-sdk`（LLM：流式生成 Brief / 合规改写 / 多模态 OCR）
- `mammoth`（docx 解析）、`pdfjs-dist`（pdf 解析）、`docx` + `file-saver`（Word 导出）
- 数据持久化：浏览器 `localStorage`（无后端数据库）

## 常用命令

- 安装依赖：`pnpm install`（仅允许 pnpm）
- 开发：`pnpm run dev`
- 类型检查：`pnpm ts-check`
- Lint：`pnpm lint`
- 构建：`pnpm run build`；生产启动：`pnpm run start`

## 目录结构

```
src/
├── app/
│   ├── page.tsx                    # 首页（一键生成入口 QuickGenerate + 最近 Brief）
│   ├── briefs/page.tsx             # Brief 列表（空态/入口）
│   ├── briefs/[id]/page.tsx        # Brief 编辑器（?autogen=1 自动生成；编辑/成品预览双视图）
│   ├── compliance/page.tsx         # 独立文案合规检测页
│   ├── library/page.tsx            # 违禁词库管理页
│   ├── settings/page.tsx           # 设置（飞书凭证 / 模型参数 / 数据管理）
│   └── api/
│       ├── ai/generate-brief/      # POST SSE：流式生成结构化 Brief
│       ├── ai/polish/              # POST：按命中风险词 AI 合规改写
│       ├── ai/ocr/                 # POST：多模态图片 OCR
│       └── feishu/read/            # POST：服务端代理飞书文档读取
├── components/
│   ├── ui/                         # shadcn/ui
│   ├── app-shell.tsx               # 左侧导航外壳
│   ├── highlighted-text.tsx        # 风险词高亮文本（合规页用）
│   ├── risk-badge.tsx              # 风险等级徽章 / 总览标签
│   ├── home/quick-generate.tsx     # 首页一键生成（粘贴/上传/拖入/粘贴截图→建Brief→带autogen跳转）
│   └── material/drop-zone.tsx      # 通用素材拖放容器（拖拽+Ctrl/Cmd+V粘贴，图片自动OCR/文档自动解析）
│   ├── brief/                      # 列表、素材面板、模块卡、编辑器、brief-preview 成品预览、blocks-view 块渲染
│   └── library/word-edit-dialog.tsx
├── hooks/
│   ├── useAppState.tsx             # 全局状态（briefs/词库/设置）+ 持久化
│   ├── useBriefAI.ts               # SSE 流式接收 + 标题/模块标记解析
│   ├── useMaterialDrop.ts          # 素材拖拽/粘贴 hook（DataTransfer.types 大小写不敏感；微信飞书截图与文档、剪贴板位图）
│   └── useCompliance.ts            # 扫描 hooks（单文本 / 多模块；note 类模块开启反面引用豁免）
├── lib/
│   ├── types.ts                    # 全部领域类型、MODULE_META、模板类型（BriefTemplateId/Kind/TemplateModuleDef）
│   ├── templates.ts                # 客户端双模板：GENERAL_TEMPLATE(11 模块) / KOC_TEMPLATE(20 模块)，含 placeholder
│   ├── blocks.ts                   # parseBlocks：把模块正文解析为 table/heading/ordered/bullet/paragraph
│   ├── server-templates.ts         # 服务端生成模板规格 + buildSystemPrompt/buildUserPrompt 所需素材
│   ├── scanner.ts                  # 违禁词扫描引擎（含重叠去重、长词优先、ignoreQuoted 反面引用豁免）
│   ├── storage.ts                  # localStorage 读写 + 默认设置
│   ├── defaults.ts                 # Brief/模块工厂（新建默认 koc 模板）
│   ├── fileParser.ts               # docx/pdf/txt 解析 + importMaterial(图片走OCR/文档走解析)+类型探测
│   ├── docxExport.ts               # 导出 .docx（按 parseBlocks 渲染真实 Word 表格/列表/小标题）
│   ├── utils.ts                    # cn / 时间格式化
│   └── data/
│       ├── forbiddenWords.ts       # 汇总导出 BUILTIN_WORDS
│       └── part1~6.ts              # 564 条内置默认词库分片
└── server.ts                       # 自定义 Node 服务入口
```

## 模板系统（参考《第四代博越 L》KOC 版式）

- `Brief.template: 'general' | 'koc'`；新建默认 `koc`，历史无该字段的 Brief 按 `general`（11 模块）渲染，两套 key 均在 `BriefModuleKey` 联合类型中。
- **KOC 模板为「如实摘录」模式（核心约束）**：只把素材已有信息原话填入、对号入座，不补充/不拓展/不润色/不改写/不脑补。必填 7 模块（素材无对应内容时正文只写「素材未提供」，不省略模块）：
  1. sixElements 六要素参考（两列表格：做什么/什么时候/在哪里/怎么做/重点/红线）
  2. infoSheet 信息总表
  3. commRules 传播规范（正文固定四个 `### ` 子项：传播基本要求/剪辑/画面/口径）
  4. objective 传播目标（沿用素材自有维度分节）
  5. audience 目标受众
  6. keyMessage 传播内容
  7. titleExamples 标题实例（原样罗列，不改写不新增）
  选填 2 模块（`optional:true`，仅当素材确有内容时模型才输出，新建默认不实例化、由 AI 输出或用户「添加模块」）：viewpoints 传播核心观点库、productInfo 产品信息附件。
  KOC 不再输出合规红线/必带话题/剪辑/画面等独立模块（剪辑、画面、口径已并入传播规范）。
- 模板定义分两处：客户端 `src/lib/templates.ts`（标题/英文名/placeholder/optional，供 UI）与服务端 `src/lib/server-templates.ts`（给模型的 guide/optional/faithful 模式），模块 key 必须一一对应；改模块时两处同步。忠实摘录指令集中在 server-templates 的 `FIDELITY` 常量，KOC `GEN_TEMPLATES[koc].faithful=true`。
- 模块标题展示仅渲染「编号 + 中文名」（如 `03 核心卖点`），`enTitle` 不在编辑卡片、成品预览、导出 Word 中显示；新增自定义模块时不再要求填英文名。
- 模块 `kind: 'rich' | 'note'`：`note`（notes 及历史 complianceRedline/wordingGuide/namingRule）为合规口径类，扫描时开启 `ignoreQuoted`（引号包裹且紧跟“不得/禁止/避免”的反面引用不命中）；否定语境豁免（不得/禁止/非…）全局生效，跨句不免责。
- **轻量块标记**：AI 正文用 Markdown 表格（表头 + `| --- | --- |` 分隔行）、`### 小标题`（观点标题末尾可带 `【★必选】/【★推荐】/【可选】`）、`- ` 无序、`1. ` 有序、普通段落。`parseBlocks`（blocks.ts）是唯一解析入口，预览 `BlocksView` 与 Word 导出 `docxExport` 都消费它，保证两端版式一致。编辑器仍是 textarea（placeholder 内教标记），不引入富文本编辑器。

## 核心数据模型

- `Brief`：含 `template` 与 `modules: BriefModule[]`（general 11 模块；koc 7 必填 + 2 选填，选填默认不实例化，key 见 `templates.ts`，可加自定义模块）、`sourceText/sourceName`（原始素材）、风险计数字段。
- `ForbiddenWord`：`word / category / level(high|medium|low) / reason / suggestion / scope(通用|汽车行业)`，内置 564 条（id 前缀 `bw-`，`builtin:true`）；用户自定义词条存独立 key。
- 内置词条「停用」= 加入 `hiddenBuiltin` 列表（不物理删除，可恢复）；自定义词支持真正增删改。「恢复默认词库」清空自定义词与停用记录。

## 扫描引擎（scanner.ts）

- `scanText(text, library)`：返回 `ScanResult { hits, highCount, mediumCount, lowCount, total }`，每个 `ScanHit` 含位置区间 `[start,end)` 与词条详情。
- 多词重叠时按「高风险优先、长词优先、位置靠前」保留；`aggregateHits` 按词聚合计数；`replaceAllWord` 用于一键替换。
- 反面引用豁免：①「不得/禁止/严禁/避免/禁用…+风险词」及「非官方指定」等否定语境全局豁免（引导词与命中词之间不得隔着句末标点）；②纯引号包裹豁免只在 note 类模块（`ignoreQuoted:true`）开启。真违规（如正文标题「10万级首选」「性价比最高」）仍然命中。
- 模块卡用「透明 textarea + 高亮叠层」双层层叠实现边编辑边高亮，两层必须保持相同字体、字号、行高、内边距与换行方式。

## AI 接口约定

- `POST /api/ai/generate-brief`（SSE）：入参 `{ material, requirement?, model?, temperature?, template?: 'general'|'koc' }`（缺省 general，但前端新建默认传 koc）；帧 `event: delta` + `data:{text}` 逐 token 推送模型正文、`event: done`、`event: error {message}`。模型正文首行为 `<<<TITLE:Brief标题>>>`（由 useBriefAI 提取后回调 onTitle 写 brief.title），其后以 `<<<MODULE:key|模块名>>>` 标记模块边界，由 `useBriefAI.generate` 内部 `buildModules` 边接收边切分（处理标记跨 chunk：末尾未闭合标记先截掉），模块 id 按出现序号在流式过程中保持稳定。`generate` 返回 `{ ok, aborted, error? }`。
- 首页「一键生成」：`QuickGenerate` 创建 Brief（写入 sourceText）→ sessionStorage 存 `autogen:<id>` 一次性指令 → 跳转 `/briefs/<id>?autogen=1`；编辑器 useEffect 读取后自动生成、完成后切到「成品预览」视图。编辑器顶栏可在「编辑 / 成品预览」(`brief-preview.tsx`) 间切换。
- `POST /api/ai/polish`：`{ text, items:[{word,suggestion}], model?, temperature? }` → `{ text }`。
- `POST /api/ai/ocr`：`{ image: data:image/...;base64,xxx, model? }` → `{ text }`（多模态模型）。
- `POST /api/feishu/read`：`{ url, appId, appSecret }`，服务端代理换取 tenant_access_token 并读取 docx/doc/wiki/sheet；未配置凭证返回 400 + `code:"FEISHU_NOT_CONFIGURED"`。凭证只存浏览器 localStorage，随请求发送，不落服务端。
- route.ts 仅允许导出 HTTP 方法与 `runtime/maxDuration` 等约定符号，禁止导出普通函数/常量（Next 类型约束）。

## 编码规范

- TypeScript strict：禁隐式 any / as any；参数与返回值显式类型。
- 客户端动态内容（Date/Math.random/localStorage）必须 `'use client'` + useEffect/useState，避免 hydration 不匹配；id 生成走 `uid()` 且仅在事件回调中调用。
- 包管理仅用 pnpm；路径配置用 `path.resolve` / `import.meta.dirname`，不写死绝对路径。
- UI 统一使用 shadcn/ui 与 Tailwind token（primary 深石墨蓝 #1F4E79，见 DESIGN.md）。
