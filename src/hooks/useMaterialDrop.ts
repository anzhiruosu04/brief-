'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  importMaterial,
  type ImportedMaterial,
} from '@/lib/fileParser';

export interface MaterialDropOptions {
  /** 导入成功回调（图片 OCR 或文档解析完成） */
  onImport: (material: ImportedMaterial) => void;
  /** OCR 使用的模型 */
  ocrModel?: string;
  /** 是否监听粘贴（Ctrl/Cmd+V 截图）事件，默认 true */
  enablePaste?: boolean;
  /** 粘贴事件过滤：返回 false 时忽略（如正在输入框内粘贴纯文本） */
  pasteEnabled?: () => boolean;
}

interface DragState {
  active: boolean;
  hasFiles: boolean;
}

/**
 * 判断拖拽数据中是否含文件。
 * 注意：DataTransfer.types 规范中文件类型为大写 "Files"（Firefox 下为小写 "application/x-moz-file"），
 * 必须大小写不敏感判断，否则微信/飞书/文件管理器拖入会被直接忽略。
 */
function dragHasFiles(e: React.DragEvent): boolean {
  const types = Array.from(e.dataTransfer?.types ?? []).map((t) => t.toLowerCase());
  return types.includes('files') || types.includes('application/x-moz-file');
}

/**
 * 统一素材拖入 / 粘贴 hook。
 * - 给目标容器 ref 绑定 dragover/drop，支持从微信、飞书、访资管理器直接拖入图片或文档；
 * - 监听 paste，支持直接 Ctrl/Cmd+V 粘贴截图（剪贴板位图）；
 * - 内部按文件类型自动分流：图片走多模态 OCR，文档走本地解析。
 */
export function useMaterialDrop({
  onImport,
  ocrModel,
  enablePaste = true,
  pasteEnabled,
}: MaterialDropOptions) {
  const [drag, setDrag] = useState<DragState>({ active: false, hasFiles: false });
  const [importing, setImporting] = useState(false);
  const dragCounter = useRef(0);
  const importSeq = useRef(0);

  const importFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files || files.length === 0) return;
      const seq = ++importSeq.current;
      setImporting(true);
      try {
        for (let i = 0; i < files.length; i += 1) {
          const raw = files[i];
          // 微信/飞书拖出的截图有时缺少规范文件名，这里兜底一个扩展名
          const file = normalizeDroppedFile(raw);
          try {
            const material = await importMaterial(file, { ocrModel });
            if (seq === importSeq.current) {
              onImport(material);
              if (material.kind === 'image') {
                toast.success('图片文字识别完成，已填入素材');
              } else {
                toast.success(`已解析《${material.name}》，共 ${material.text.length.toLocaleString()} 字`);
              }
            }
          } catch (err) {
            toast.error(err instanceof Error ? err.message : '素材导入失败');
          }
          // 当前各入口均为单素材编辑，只处理第一个文件
          break;
        }
      } finally {
        if (seq === importSeq.current) setImporting(false);
      }
    },
    [onImport, ocrModel],
  );

  // 拖拽（绑定到容器）
  const onDragEnter = useCallback((e: React.DragEvent) => {
    if (!dragHasFiles(e)) return;
    e.preventDefault();
    dragCounter.current += 1;
    setDrag({ active: true, hasFiles: true });
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (!dragHasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (!dragHasFiles(e)) return;
    e.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) {
      setDrag({ active: false, hasFiles: false });
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (!dragHasFiles(e)) return;
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setDrag({ active: false, hasFiles: false });
      // 除标准 files 外，部分来源会把文件信息放进 items，统一兜底提取
      const dropped = e.dataTransfer.files;
      if (!dropped || dropped.length === 0) {
        toast.error('未读取到文件内容，请改用「点击上传」或 Ctrl/Cmd+V 粘贴截图');
        return;
      }
      void importFiles(dropped);
    },
    [importFiles],
  );

  // 粘贴截图（绑定到容器）
  useEffect(() => {
    if (!enablePaste) return;
    const handler = (e: ClipboardEvent) => {
      if (pasteEnabled && !pasteEnabled()) return;
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        const anyImage = Array.from(files).some((f) => f.type.startsWith('image/'));
        if (anyImage) {
          e.preventDefault();
          void importFiles(files);
        }
      }
    };
    const target = document;
    target.addEventListener('paste', handler);
    return () => target.removeEventListener('paste', handler);
  }, [enablePaste, pasteEnabled, importFiles]);

  return {
    drag,
    importing,
    importFiles,
    dragHandlers: { onDragEnter, onDragOver, onDragLeave, onDrop },
  };
}

/**
 * 不同来源拖出的文件命名不规范：
 * - 部分飞书/微信截图 File.name 为空或 "image"，无扩展名；
 * - 依据 MIME 补一个扩展名，避免后续解析与提示异常。
 */
function normalizeDroppedFile(file: File): File {
  const hasExt = /\.[a-z0-9]{2,5}$/i.test(file.name);
  if (hasExt) return file;
  const mime = file.type.toLowerCase();
  let ext = '';
  if (mime.includes('png')) ext = 'png';
  else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
  else if (mime.includes('webp')) ext = 'webp';
  else if (mime.includes('gif')) ext = 'gif';
  else if (mime.includes('bmp')) ext = 'bmp';
  else if (mime === 'application/pdf') ext = 'pdf';
  else if (mime.includes('wordprocessingml')) ext = 'docx';
  if (!ext) return file;
  const base = file.name && file.name.trim() !== '' ? file.name : 'pasted';
  return new File([file], `${base}.${ext}`, { type: file.type });
}
