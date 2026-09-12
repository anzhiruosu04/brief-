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
