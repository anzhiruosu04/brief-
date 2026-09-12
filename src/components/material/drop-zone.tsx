'use client';

import { ImageUp, FileUp } from 'lucide-react';
import { useMaterialDrop, type MaterialDropOptions } from '@/hooks/useMaterialDrop';
import { cn } from '@/lib/utils';

interface DropZoneProps extends MaterialDropOptions {
  children: React.ReactNode;
  className?: string;
  /** 是否占满父容器（默认 true） */
  fill?: boolean;
}

/**
 * 可复用的素材拖放容器：
 * 包裹任意区域后，该区域即可接收从微信/飞书/文件管理器拖入的图片或文档，
 * 也支持在区域内 Ctrl/Cmd+V 粘贴截图。拖拽时显示高亮描边 + 居中遮罩提示。
 */
export function DropZone({
  children,
  className,
  fill = true,
  ...dropOptions
}: DropZoneProps) {
  const { drag, importing, dragHandlers } = useMaterialDrop(dropOptions);

  return (
    <div
      className={cn(fill && 'relative', className)}
      {...dragHandlers}
    >
      {children}
      {drag.active && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-[inherit]">
          <div className="absolute inset-0 rounded-[inherit] bg-primary/[0.06] ring-2 ring-inset ring-primary" />
          <div className="relative flex flex-col items-center gap-3 rounded-xl border border-primary/30 bg-white/95 px-8 py-6 text-center shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ImageUp size={22} />
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileUp size={22} />
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">
                松开即可导入素材
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                图片自动识别文字 · 文档自动解析（支持截图 / PNG / JPG / DOCX / PDF / TXT）
              </p>
            </div>
          </div>
        </div>
      )}
      {importing && (
        <div className="pointer-events-none absolute right-3 top-3 z-40 flex items-center gap-2 rounded-full border border-line bg-white/95 px-3 py-1.5 text-xs font-medium text-primary shadow-sm">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          正在识别 / 解析…
        </div>
      )}
    </div>
  );
}
