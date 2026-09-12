'use client';

import {
  AlignmentType,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  TextRun,
} from 'docx';
import { saveAs } from 'file-saver';
import type { Brief, RiskLevel } from './types';

const LEVEL_LABEL: Record<RiskLevel, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};

/** 将一段文本按换行拆分为多个段落（空行保留为间隔） */
function contentParagraphs(content: string): Paragraph[] {
  const lines = content.split('\n');
  return lines.map(
    (line) =>
      new Paragraph({
        children: [new TextRun({ text: line || ' ', size: 22, font: '微软雅黑' })],
        spacing: { after: 120, line: 360 },
      }),
  );
}

export async function exportBriefToDocx(brief: Brief): Promise<void> {
  const children: Paragraph[] = [];

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
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: `${String(index + 1).padStart(2, '0')}  ${module.title}`,
            bold: true,
            size: 28,
            color: '1F4E79',
            font: '微软雅黑',
          }),
          new TextRun({
            text: `   ${module.enTitle}`,
            size: 18,
            color: '8F959E',
            font: 'Arial',
          }),
        ],
      }),
    );
    const body = module.content.trim();
    if (body) {
      children.push(...contentParagraphs(body));
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '（待补充）', italics: true, color: '8F959E', size: 20 })],
        }),
      );
    }
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
