'use client';

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { saveAs } from 'file-saver';
import type { Brief, RiskLevel } from './types';
import { parseBlocks, type ContentBlock } from './blocks';

const LEVEL_LABEL: Record<RiskLevel, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};

const FONT = '微软雅黑';
const BODY = 21; // 10.5pt
const HEADER_FILL = 'F2F4F7';
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: 'D9DDE3' };
const CELL_BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

/** 去掉行内 **加粗** 标记，生成 TextRun（保留 #话题 等原文） */
function inlineRuns(text: string, opts: { bold?: boolean; italics?: boolean; size?: number; color?: string } = {}): TextRun[] {
  const size = opts.size ?? BODY;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts
    .filter((p) => p.length > 0)
    .map((p) => {
      const boldMark = /^\*\*[^*]+\*\*$/.test(p);
      const clean = boldMark ? p.slice(2, -2) : p;
      return new TextRun({
        text: clean,
        bold: opts.bold || boldMark,
        italics: opts.italics,
        size,
        color: opts.color,
        font: FONT,
      });
    });
}

function bodyParagraph(text: string, opts: { after?: number; italics?: boolean; color?: string } = {}): Paragraph {
  return new Paragraph({
    children: inlineRuns(text, { italics: opts.italics, color: opts.color }),
    spacing: { after: opts.after ?? 100, line: 320 },
  });
}

function tableBlock(block: Extract<ContentBlock, { type: 'table' }>): Table {
  const colCount = block.header.length;
  const widthsPct = colCount === 2 ? [26, 74] : Array.from({ length: colCount }, () => Math.floor(100 / colCount));

  const cell = (text: string, isHeader: boolean, colIdx: number): TableCell =>
    new TableCell({
      width: { size: widthsPct[colIdx] ?? Math.floor(100 / colCount), type: WidthType.PERCENTAGE },
      shading: isHeader ? { type: ShadingType.CLEAR, fill: HEADER_FILL, color: 'auto' } : undefined,
      borders: CELL_BORDERS,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [
        new Paragraph({
          children: inlineRuns(text, { bold: isHeader, size: BODY }),
          spacing: { line: 300 },
        }),
      ],
    });

  const rows: TableRow[] = [];
  rows.push(
    new TableRow({
      tableHeader: true,
      children: block.header.map((h, ci) => cell(h, true, ci)),
    }),
  );
  block.rows.forEach((r) => {
    const norm = r.slice(0, colCount);
    while (norm.length < colCount) norm.push('');
    rows.push(new TableRow({ children: norm.map((c, ci) => cell(c, false, ci)) }));
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

/** 将模块正文按块转为 docx 元素（表格/小标题/列表/段落） */
function moduleChildren(content: string, generating?: boolean): Array<Paragraph | Table> {
  const trimmed = content.trim();
  if (!trimmed) {
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: generating ? '生成中…' : '（待补充）',
            italics: true,
            color: '9AA0A6',
            size: 20,
            font: FONT,
          }),
        ],
      }),
    ];
  }

  const out: Array<Paragraph | Table> = [];
  parseBlocks(trimmed).forEach((b) => {
    switch (b.type) {
      case 'table':
        out.push(tableBlock(b));
        out.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
        break;
      case 'heading': {
        const tag = b.priority === 'required' ? '  【★必选】' : b.priority === 'recommend' ? '  【★推荐】' : b.priority === 'optional' ? '  【可选】' : '';
        out.push(
          new Paragraph({
            spacing: { before: 140, after: 80 },
            children: [
              new TextRun({ text: b.text + tag, bold: true, size: 22, color: '1F2329', font: FONT }),
            ],
          }),
        );
        break;
      }
      case 'bullet':
        b.items.forEach((it) => {
          out.push(
            new Paragraph({
              bullet: { level: 0 },
              children: inlineRuns(it),
              spacing: { after: 60, line: 320 },
            }),
          );
        });
        break;
      case 'ordered':
        b.items.forEach((it, idx) => {
          out.push(
            new Paragraph({
              indent: { left: 360, hanging: 360 },
              children: [
                new TextRun({ text: `${idx + 1}. `, bold: true, size: BODY, font: FONT }),
                ...inlineRuns(it),
              ],
              spacing: { after: 60, line: 320 },
            }),
          );
        });
        break;
      case 'paragraph':
        out.push(bodyParagraph(b.text));
        break;
      default:
        break;
    }
  });
  return out;
}

export async function exportBriefToDocx(brief: Brief): Promise<void> {
  const children: Array<Paragraph | Table> = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      spacing: { after: 120 },
      children: [new TextRun({ text: brief.title, bold: true, size: 40, font: '微软雅黑' })],
    }),
  );

  const metaParts: string[] = [];
  if (brief.project) metaParts.push(`项目 / 车型：${brief.project}`);
  if (brief.riskLevel !== 'none') {
    metaParts.push(`合规风险：仍有 ${brief.issueCount} 处待处理（最高${LEVEL_LABEL[brief.riskLevel]}）`);
  } else {
    metaParts.push('合规状态：未发现待处理风险词');
  }
  metaParts.push(`更新时间：${new Date(brief.updatedAt).toLocaleString('zh-CN')}`);

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
      children: [
        new TextRun({ text: metaParts.join('　｜　'), size: 18, color: '646A73', font: '微软雅黑' }),
      ],
    }),
  );

  brief.modules.forEach((module, index) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 260, after: 120 },
        children: [
          new TextRun({
            text: `${String(index + 1).padStart(2, '0')}  ${module.title}`,
            bold: true,
            size: 27,
            color: '1F4E79',
            font: FONT,
          }),
        ],
      }),
    );
    children.push(...moduleChildren(module.content));
  });

  const doc = new Document({
    creator: 'Brief 智能工作台',
    title: brief.title,
    description: '由 Brief 智能工作台导出',
    styles: {
      default: {
        document: { run: { font: '微软雅黑', size: 22 } },
      },
    },
    sections: [
      {
        properties: {},
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Brief 智能工作台 · 第 ', size: 16, color: '8F959E' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '8F959E' }),
                  new TextRun({ text: ' 页（导出内容仅供内部使用，发布前请以法务终审为准）', size: 16, color: '8F959E' }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeName = brief.title.replace(/[\\/:*?"<>|]/g, '_') || 'brief';
  saveAs(blob, `${safeName}.docx`);
}

/** 合规检测报告导出 */
export async function exportReportToDocx(params: {
  title: string;
  text: string;
  summary: { high: number; medium: number; low: number };
  findings: Array<{
    word: string;
    level: RiskLevel;
    category: string;
    reason: string;
    suggestion: string;
    count: number;
  }>;
}): Promise<void> {
  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: params.title, bold: true, size: 40, font: '微软雅黑' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
      children: [
        new TextRun({
          text: `高风险 ${params.summary.high} 处 ｜ 中风险 ${params.summary.medium} 处 ｜ 低风险 ${params.summary.low} 处 ｜ 生成时间 ${new Date().toLocaleString('zh-CN')}`,
          size: 18,
          color: '646A73',
        }),
      ],
    }),
  ];

  if (params.findings.length === 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: '本次检测未发现命中词库的违禁词。', size: 22 })],
      }),
    );
  } else {
    params.findings.forEach((f, i) => {
      children.push(
        new Paragraph({
          spacing: { before: 160, after: 60 },
          children: [
            new TextRun({ text: `${i + 1}. 「${f.word}」`, bold: true, size: 24, font: '微软雅黑' }),
            new TextRun({
              text: `  ${LEVEL_LABEL[f.level]} · ${f.category} · 出现 ${f.count} 次`,
              size: 20,
              color: f.level === 'high' ? 'D93026' : f.level === 'medium' ? 'D97A00' : 'A8801C',
            }),
          ],
        }),
        new Paragraph({
          children: [new TextRun({ text: `风险说明：${f.reason}`, size: 20 })],
        }),
        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: `替换建议：${f.suggestion}`, size: 20, color: '1A8754' })],
        }),
      );
    });
  }

  children.push(
    new Paragraph({
      spacing: { before: 360 },
      children: [new TextRun({ text: '—— 检测原文 ——', bold: true, size: 22, color: '646A73' })],
    }),
  );
  params.text.split('\n').forEach(
    (line) =>
      new Paragraph({
        children: [new TextRun({ text: line || ' ', size: 20 })],
      }),
  );

  const doc = new Document({
    creator: 'Brief 智能工作台',
    title: params.title,
    sections: [{ children }],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${params.title.replace(/[\\/:*?"<>|]/g, '_')}.docx`);
}

/** Brief 对照审核报告导出 */
export async function exportReviewReportToDocx(params: {
  briefTitle: string;
  verdict: 'pass' | 'fail' | 'unknown';
  summary: string;
  missing: Array<{ requirement: string; detail: string; suggestion: string }>;
  violations: Array<{
    requirement: string;
    detail: string;
    quote?: string;
    suggestion: string;
  }>;
  suggestions: string[];
}): Promise<void> {
  const verdictText =
    params.verdict === 'pass'
      ? '通过'
      : params.verdict === 'fail'
        ? '不通过'
        : '待人工复核';
  const verdictColor =
    params.verdict === 'pass' ? '1A8754' : params.verdict === 'fail' ? 'D93026' : 'D97A00';

  const children: Array<Paragraph | Table> = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'Brief 对照审核报告', bold: true, size: 40, font: '微软雅黑' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: params.briefTitle, size: 22, color: '646A73' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({ text: `审核结论：${verdictText}`, bold: true, size: 26, color: verdictColor }),
        new TextRun({
          text: `    缺失项 ${params.missing.length} 条 ｜ 违规项 ${params.violations.length} 条`,
          size: 20,
          color: '646A73',
        }),
      ],
    }),
  ];

  if (params.summary) {
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: '总体说明：', bold: true, size: 22, font: '微软雅黑' }),
          new TextRun({ text: params.summary, size: 22 }),
        ],
      }),
    );
  }

  const pushIssue = (
    index: number,
    label: string,
    color: string,
    issue: { requirement: string; detail: string; quote?: string; suggestion: string },
  ) => {
    children.push(
      new Paragraph({
        spacing: { before: 160, after: 60 },
        children: [
          new TextRun({ text: `${index}. ${label}`, bold: true, size: 24, color: color, font: '微软雅黑' }),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({ text: 'Brief 要求：', bold: true, size: 20 }),
          new TextRun({ text: issue.requirement || '—', size: 20 }),
        ],
      }),
    );
    if (issue.detail) {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: label === '违规' ? '问题：' : '缺失：', bold: true, size: 20 }),
            new TextRun({ text: issue.detail, size: 20 }),
          ],
        }),
      );
    }
    if (issue.quote) {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: '草稿原文：', bold: true, size: 20 }),
            new TextRun({ text: `“${issue.quote}”`, size: 20, italics: true, color: 'D93026' }),
          ],
        }),
      );
    }
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: '修改建议：', bold: true, size: 20 }),
          new TextRun({ text: issue.suggestion || '—', size: 20, color: '1A8754' }),
        ],
      }),
    );
  };

  if (params.missing.length) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 80 },
        children: [new TextRun({ text: '一、要求有但草稿缺失', bold: true, size: 28, font: '微软雅黑' })],
      }),
    );
    params.missing.forEach((it, i) => pushIssue(i + 1, '缺失', 'D97A00', it));
  }

  if (params.violations.length) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 80 },
        children: [new TextRun({ text: '二、禁止却在草稿出现', bold: true, size: 28, font: '微软雅黑' })],
      }),
    );
    params.violations.forEach((it, i) => pushIssue(i + 1, '违规', 'D93026', it));
  }

  if (!params.missing.length && !params.violations.length) {
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: '草稿已满足 Brief 中明确写出的全部硬性要求，未发现缺失项或违规项。',
            size: 22,
          }),
        ],
      }),
    );
  }

  if (params.suggestions.length) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 80 },
        children: [new TextRun({ text: '附：优化建议（非必须）', bold: true, size: 28, font: '微软雅黑' })],
      }),
    );
    params.suggestions.forEach((s) => {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          children: [new TextRun({ text: s, size: 20 })],
        }),
      );
    });
  }

  const doc = new Document({
    creator: 'Brief 智能工作台',
    title: 'Brief 对照审核报告',
    sections: [{ children }],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Brief对照审核报告_${params.briefTitle.replace(/[\\/:*?"<>|]/g, '_').slice(0, 40)}.docx`);
}
