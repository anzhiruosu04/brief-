import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { AppStateProvider } from '@/hooks/useAppState';

export const metadata: Metadata = {
  title: {
    default: 'Brief 智能工作台',
    template: '%s · Brief 智能工作台',
  },
  description:
    '面向车企传播岗的 AI Brief 生成与广告合规审核工作台：素材解析、结构化 Brief、违禁词实时扫描与 Word 导出。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="bg-background text-foreground antialiased">
        <AppStateProvider>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </AppStateProvider>
      </body>
    </html>
  );
}
