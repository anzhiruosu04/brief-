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
│   ├── brief/                      # 列表、素材面板、模块卡、编辑器、brief-preview 成品预览
│   └── library/word-edit-dialog.tsx
├── hooks/
│   ├── useAppState.tsx             # 全局状态（briefs/词库/设置）+ 持久化
│   ├── useBriefAI.ts               # SSE 流式接收 + 模块标记解析
│   ├── useMaterialDrop.ts          # 素材拖拽/粘贴 hook（微信飞书截图与文档、剪贴板位图）
│   └── useCompliance.ts            # 扫描 hooks（单文本 / 多模块）
├── lib/
│   ├── types.ts                    # 全部领域类型与 MODULE_META
│   ├── scanner.ts                  # 违禁词扫描引擎（含重叠去重、长词优先）
│   ├── storage.ts                  # localStorage 读写 + 默认设置
│   ├── defaults.ts                 # Brief/模块工厂
│   ├── fileParser.ts               # docx/pdf/txt 解析 + importMaterial(图片走OCR/文档走解析)+类型探测
│   ├── docxExport.ts               # 导出 .docx
│   ├── utils.ts                    # cn / 时间格式化
│   └── data/
│       ├── forbiddenWords.ts       # 汇总导出 BUILTIN_WORDS
│       └── part1~6.ts              # 564 条内置默认词库分片
└── server.ts                       # 自定义 Node 服务入口
```

## 核心数据模型

- `Brief`：含 `modules: BriefModule[]`（11 个标准模块 key 见 `MODULE_META`，可加自定义模块）、`sourceText/sourceName`（原始素材）、风险计数字段。
- `ForbiddenWord`：`word / category / level(high|medium|low) / reason / suggestion / scope(通用|汽车行业)`，内置 564 条（id 前缀 `bw-`，`builtin:true`）；用户自定义词条存独立 key。
- 内置词条「停用」= 加入 `hiddenBuiltin` 列表（不物理删除，可恢复）；自定义词支持真正增删改。「恢复默认词库」清空自定义词与停用记录。

## 扫描引擎（scanner.ts）

- `scanText(text, library)`：返回 `ScanResult { hits, highCount, mediumCount, lowCount, total }`，每个 `ScanHit` 含位置区间 `[start,end)` 与词条详情。
- 多词重叠时按「高风险优先、长词优先、位置靠前」保留；`aggregateHits` 按词聚合计数；`replaceAllWord` 用于一键替换。
- 模块卡用「透明 textarea + 高亮叠层」双层层叠实现边编辑边高亮，两层必须保持相同字体、字号、行高、内边距与换行方式。

## AI 接口约定

- `POST /api/ai/generate-brief`（SSE）：入参 `{ material, requirement?, model?, temperature? }`；帧 `event: delta` + `data:{text}` 逐 token 推送模型正文、`event: done`、`event: error {message}`。模型正文中以 `<<<MODULE:key|模块名>>>` 标记模块边界，由 `useBriefAI.generate` 内部 `buildModules` 边接收边切分（处理标记跨 chunk：末尾未闭合标记先截掉），模块 id 按出现序号在流式过程中保持稳定。`generate` 返回 `{ ok, aborted, error? }`。
- 首页「一键生成」：`QuickGenerate` 创建 Brief（写入 sourceText）→ sessionStorage 存 `autogen:<id>` 一次性指令 → 跳转 `/briefs/<id>?autogen=1`；编辑器 useEffect 读取后自动生成、完成后切到「成品预览」视图。编辑器顶栏可在「编辑 / 成品预览」(`brief-preview.tsx`) 间切换。
- `POST /api/ai/polish`：`{ text, items:[{word,suggestion}], model?, temperature? }` → `{ text }`。
- `POST /api/ai/ocr`：`{ image: data:image/...;base64,xxx, model? }` → `{ text }`（多模态模型）。
- `POST /api/feishu/read`：`{ url, appId, appSecret }`，服务端代理换取 tenant_access_token 并读取 docx/doc/wiki/sheet；未配置凭证返回 400 + `code:"FEISHU_NOT_CONFIGURED"`。凭证只存浏览器 localStorage，随请求发送，不落服务端。
- route.ts 仅允许导出 HTTP 方法与 `runtime/maxDuration` 等约定符号，禁止导出普通函数/常量（Next 类型约束）。

## 编码规范

- TypeScript strict：禁隐式 any / as any；参数与返回值显式类型。
- 客户端动态内容（Date/Math.random/localStorage）必须 `'use client'` + useEffect/useState，避免 hydration 不匹配；id 生成走 `uid()` 且仅在事件回调中调用。
- 包管理仅用 pnpm；路径配置用 `path.resolve` / `import.meta.dirname`，不写死绝对路径。
- UI 统一使用 shadcn/ui 与 Tailwind token（primary 酒红 #8C1D40，见 DESIGN.md）。
