'use client';

import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { PDFDocumentProxy } from 'pdfjs-dist';

// 为 pdf worker 指定 CDN，版本与依赖锁定一致
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc =
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/legacy/build/pdf.worker.min.mjs';
}

export interface ParsedFile {
  name: string;
  text: string;
  size: number;
}

const MAX_TEXT_LENGTH = 200_000;

export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  let text = '';
  if (
    file.type === 'text/plain' ||
    ext === 'txt' ||
    ext === 'md' ||
    ext === 'csv'
  ) {
    text = await file.text();
  } else if (ext === 'docx' || file.name.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    text = result.value;
  } else if (ext === 'doc' || file.name.endsWith('.doc')) {
    throw new Error('暂不支持旧版 .doc 格式，请在 Word 中另存为 .docx 后上传');
  } else if (ext === 'pdf' || file.type === 'application/pdf') {
    text = await parsePdf(await file.arrayBuffer());
  } else {
    throw new Error(`暂不支持 .${ext} 格式，支持 txt / docx / pdf`);
  }
  text = text.replace(/\r\n/g, '\n').trim().slice(0, MAX_TEXT_LENGTH);
  if (!text) {
    throw new Error('未从文件中解析到文本内容（可能是纯图片扫描件，可改用图片 OCR）');
  }
  return { name: file.name, text, size: file.size };
}

async function parsePdf(data: ArrayBuffer): Promise<string> {
  const pdf: PDFDocumentProxy = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  const maxPages = Math.min(pdf.numPages, 200);
  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/[ \t]+/g, ' ');
    pages.push(pageText);
  }
  return pages.join('\n\n');
}

/** 图片转 data URI（供 OCR 接口使用） */
export function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
}

export type MaterialKind = 'image' | 'document' | 'unsupported';

const DOC_EXTENSIONS = ['txt', 'md', 'csv', 'docx', 'pdf'];

/**
 * 判断导入素材类型。微信/飞书拖拽出的文件可能没有扩展名或文件名被改写，
 * 因此优先依据 MIME 类型，再回退到扩展名。
 */
export function detectMaterialKind(file: File): MaterialKind {
  const type = file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (type.startsWith('image/')) return 'image';
  if (
    type === 'application/pdf' ||
    type.startsWith('text/') ||
    type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    (DOC_EXTENSIONS.includes(ext) && ext !== '')
  ) {
    return 'document';
  }
  // 无 MIME 但扩展名可识别
  if (DOC_EXTENSIONS.includes(ext)) return 'document';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'heic', 'heif'].includes(ext)) {
    return 'image';
  }
  return 'unsupported';
}

export interface ImportedMaterial {
  kind: MaterialKind;
  text: string;
  name: string;
  /** 图片 OCR 时附带的 data URI 缩略图 */
  preview?: string;
}

export interface ImportOptions {
  ocrModel?: string;
  /** 自定义 OCR 提示词 */
  ocrPrompt?: string;
}

/**
 * 统一素材导入入口：
 * - 图片（含微信/飞书截图、粘贴的剪贴板位图）→ 多模态 OCR
 * - 文档 docx/pdf/txt/md/csv → 本地解析
 * 不支持的类型直接抛出可读错误。
 */
export async function importMaterial(
  file: File,
  options: ImportOptions = {},
): Promise<ImportedMaterial> {
  const kind = detectMaterialKind(file);
  if (kind === 'image') {
    const dataUri = await fileToDataUri(file);
    const resp = await fetch('/api/ai/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: dataUri,
        model: options.ocrModel,
        prompt:
          options.ocrPrompt ??
          '请识别图片中的全部中文文字内容，保持原有段落顺序，仅输出识别到的文字本身，不要添加解释。',
      }),
    });
    const data = (await resp.json()) as { text?: string; error?: string };
    if (!resp.ok || !data.text) {
      throw new Error(data.error ?? '图片文字识别失败');
    }
    const name = file.name && file.name !== 'image.png' ? file.name : '剪贴板/截图 OCR';
    return { kind: 'image', text: data.text.trim(), name, preview: dataUri };
  }
  if (kind === 'document') {
    const parsed = await parseFile(file);
    return { kind: 'document', text: parsed.text, name: parsed.name };
  }
  throw new Error('暂不支持该文件类型，可拖入图片（截图）或 docx / pdf / txt 文档');
}
