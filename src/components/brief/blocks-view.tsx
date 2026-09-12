'use client';

import { parseBlocks, type ContentBlock } from '@/lib/blocks';
import { cn } from '@/lib/utils';

const PRIORITY_STYLES: Record<string, { label: string; cls: string }> = {
  required: { label: '★必选', cls: 'bg-red-50 text-red-600 border-red-200' },
  recommend: { label: '★推荐', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  optional: { label: '可选', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
};

/** 行内轻量渲染：加粗 **x**、话题标签高亮、书名号保留 */
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  // 切分 **加粗** 与 #话题
  const parts = text.split(/(\*\*[^*]+\*\*|#[^#\s，。；、]+)/g);
  return parts.map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return (
        <strong key={key} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (/^#[^#\s]/.test(part)) {
      return (
        <span key={key} className="font-medium text-primary">
          {part}
        </span>
      );
    }
    return <span key={key}>{part}</span>;
  });
}

function TableBlock({ block }: { block: Extract<ContentBlock, { type: 'table' }> }) {
  return (
    <div className="my-1 overflow-x-auto rounded-md border border-line">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-slate-50">
            {block.header.map((h, i) => (
              <th
                key={i}
                className={cn(
                  'border-b border-line px-3 py-2 text-left font-semibold text-foreground',
                  i === 0 && 'w-[26%] whitespace-nowrap text-[12.5px]',
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 1 ? 'bg-slate-50/40' : ''}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={cn(
                    'align-top border-b border-line/70 px-3 py-2 leading-[1.75] text-slate-700',
                    ci === 0 && 'font-medium text-foreground/90',
                  )}
                >
                  {renderInline(cell, `t${ri}-${ci}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BlocksView({ text, generating }: { text: string; generating?: boolean }) {
  const blocks = parseBlocks(text);

  if (!text.trim()) {
    return (
      <span className="text-[13px] text-placeholder">
        {generating ? '生成中…' : '（暂无内容）'}
      </span>
    );
  }

  return (
    <div className="space-y-2 text-[13.5px] leading-[1.85] text-slate-700">
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'table':
            return <TableBlock key={i} block={b} />;
          case 'heading': {
            const pr = b.priority ? PRIORITY_STYLES[b.priority] : null;
            return (
              <div key={i} className="flex flex-wrap items-center gap-2 pt-2">
                <h4 className="text-[13.5px] font-semibold text-foreground">
                  {renderInline(b.text, `h${i}`)}
                </h4>
                {pr && (
                  <span
                    className={cn(
                      'rounded border px-1.5 py-0.5 text-[10.5px] font-medium leading-none',
                      pr.cls,
                    )}
                  >
                    {pr.label}
                  </span>
                )}
              </div>
            );
          }
          case 'bullet':
            return (
              <ul key={i} className="space-y-1 pl-1">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-2">
                    <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                    <span>{renderInline(it, `b${i}-${j}`)}</span>
                  </li>
                ))}
              </ul>
            );
          case 'ordered':
            return (
              <ol key={i} className="space-y-1">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-2.5">
                    <span className="shrink-0 font-medium tabular-nums text-primary">
                      {j + 1}.
                    </span>
                    <span>{renderInline(it, `o${i}-${j}`)}</span>
                  </li>
                ))}
              </ol>
            );
          case 'paragraph':
            return <p key={i}>{renderInline(b.text, `p${i}`)}</p>;
          default:
            return null;
        }
      })}
    </div>
  );
}
