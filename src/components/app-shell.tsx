'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ShieldCheck, LayoutDashboard, ScanText, BookOpen, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/briefs', label: 'Brief 工作台', icon: LayoutDashboard },
  { href: '/compliance', label: '文案合规检测', icon: ScanText },
  { href: '/library', label: '违禁词库', icon: BookOpen },
  { href: '/settings', label: '设置', icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden bg-page-bg">
      {/* 侧边导航 */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-14 items-center gap-2.5 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-4.5 w-4.5" size={18} />
          </span>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">
              Brief 智能工作台
            </div>
            <div className="text-[11px] text-muted-foreground">
              汽车传播合规助手
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-3">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] transition-colors',
                  active
                    ? 'bg-sidebar-accent font-medium text-primary'
                    : 'text-slate-600 hover:bg-sidebar-accent/60 hover:text-foreground',
                )}
              >
                <Icon size={17} strokeWidth={active ? 2.1 : 1.8} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-5 py-3 text-[11px] leading-relaxed text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            本地持久化 · 数据不出浏览器
          </div>
          <div className="mt-1">内置词库 564 条 · 依据《广告法》等法规</div>
        </div>
      </aside>

      {/* 主区域 */}
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-white px-6">
      <div>
        <h1 className="text-[15px] font-semibold leading-none">{title}</h1>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
