/**
 * 轻量内容块解析器
 * 把模块正文（AI 生成的轻量标记）解析为结构化块，供「成品预览」与「Word 导出」共用：
 *  - table：连续 `| a | b |` 行，首行为表头
 *  - heading：`### 小标题`
 *  - ordered：`1. xxx`
 *  - bullet：`- xxx` / `• xxx`
 *  - paragraph：其余普通文本（空行分段）
 */

export type ContentBlock =
  | { type: 'table'; header: string[]; rows: string[][] }
  | { type: 'heading'; text: string; priority?: 'required' | 'recommend' | 'optional' }
  | { type: 'ordered'; items: string[] }
  | { type: 'bullet'; items: string[] }
  | { type: 'paragraph'; text: string }
  | { type: 'spacer' };

const TABLE_SEPARATOR = /^\s*:?-{2,}:?\s*$/;

function splitRow(line: string): string[] {
  // 去掉首尾的 |，再按 | 切分
  return line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((c) => c.trim());
}

function isTableRow(line: string): boolean {
  const t = line.trim();
  if (!t.startsWith('|')) return false;
  const cells = splitRow(t);
  return cells.length >= 2 && cells.some((c) => c.length > 0);
}

/**
 * 识别观点小标题末尾的优先级标记。兼容模型的多种写法：
 * 【★必选】 / 【必选】 / ★必选 / （★推荐） / [可选] / 结尾冗余的「必选★必选」等。
 */
function extractPriority(text: string): {
  text: string;
  priority?: 'required' | 'recommend' | 'optional';
} {
  const map = { 必选: 'required', 推荐: 'recommend', 可选: 'optional' } as const;
  type Level = '必选' | '推荐' | '可选';
  // 末尾包装形式：括号（中文/英文/方括号）内可含 ★
  const wrapped = text.match(/[【\[（(]\s*★?\s*(必选|推荐|可选)\s*[】\]）)]\s*$/);
  if (wrapped) {
    const lv = wrapped[1] as Level;
    // 同时去掉标题正文末尾冗余的同款词（如「必选【★必选】」→「…」）
    const clean = text
      .slice(0, wrapped.index)
      .replace(new RegExp(`[★\\s]*${lv}\\s*$`), '')
      .trim();
    return { text: clean, priority: map[lv] };
  }
  // 裸标记：★必选 / 必选（仅当末尾以 ★ 引导，避免误杀普通语句）
  const bare = text.match(/★\s*(必选|推荐|可选)\s*$/);
  if (bare) {
    const lv = bare[1] as Level;
    return { text: text.slice(0, bare.index).replace(new RegExp(`[★\\s]*${lv}\\s*$`), '').trim(), priority: map[lv] };
  }
  return { text };
}

export function parseBlocks(content: string): ContentBlock[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: ContentBlock[] = [];

  let i = 0;
  let bulletBuf: string[] = [];
  let orderedBuf: string[] = [];

  const flushLists = (): void => {
    if (bulletBuf.length) {
      blocks.push({ type: 'bullet', items: bulletBuf });
      bulletBuf = [];
    }
    if (orderedBuf.length) {
      blocks.push({ type: 'ordered', items: orderedBuf });
      orderedBuf = [];
    }
  };

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    // 表格：当前行是表格且下一行（若存在）为分隔线，或直接连续多行表格
    if (isTableRow(line)) {
      flushLists();
      const tableLines: string[] = [];
      while (i < lines.length && isTableRow(lines[i].trim())) {
        tableLines.push(lines[i].trim());
        i += 1;
      }
      // 第一行表头；第二行若是 --- 分隔则跳过
      let header = splitRow(tableLines[0]);
      let bodyStart = 1;
      if (tableLines[1] && splitRow(tableLines[1]).every((c) => TABLE_SEPARATOR.test(c))) {
        bodyStart = 2;
      }
      const rows = tableLines.slice(bodyStart).map(splitRow);
      // 兼容 AI 把表头写成「要素 | 内容」之外的场景；列数以表头为准补齐
      const colCount = header.length;
      const normRows = rows
        .filter((r) => r.some((c) => c.length > 0))
        .map((r) => {
          const copy = r.slice(0, colCount);
          while (copy.length < colCount) copy.push('');
          return copy;
        });
      blocks.push({ type: 'table', header, rows: normRows });
      continue;
    }

    if (!line) {
      flushLists();
      i += 1;
      continue;
    }

    if (line.startsWith('###')) {
      flushLists();
      const t = line.replace(/^###+\s*/, '').trim();
      const { text, priority } = extractPriority(t);
      blocks.push({ type: 'heading', text, priority });
      i += 1;
      continue;
    }

    const bulletM = line.match(/^[-•*]\s+(.+)$/);
    if (bulletM) {
      if (orderedBuf.length) flushLists();
      bulletBuf.push(bulletM[1].trim());
      i += 1;
      continue;
    }

    const orderedM = line.match(/^\d+[.、)]\s*(.+)$/);
    if (orderedM) {
      if (bulletBuf.length) flushLists();
      orderedBuf.push(orderedM[1].trim());
      i += 1;
      continue;
    }

    // 普通段落
    flushLists();
    blocks.push({ type: 'paragraph', text: line });
    i += 1;
  }

  flushLists();
  return blocks;
}
