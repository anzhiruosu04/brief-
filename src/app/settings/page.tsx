'use client';

import { useState } from 'react';
import {
  KeyRound,
  Sparkles,
  BookOpen,
  Database,
  Eye,
  EyeOff,
  Check,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { AppShell, PageHeader } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppState } from '@/hooks/useAppState';
import { STORAGE_KEYS } from '@/lib/storage';
import { toast } from 'sonner';

const MODELS = [
  { id: 'doubao-seed-2-0-pro-260215', label: '豆包 Seed 2.0 Pro（旗舰，多模态）' },
  { id: 'doubao-seed-2-0-lite-260215', label: '豆包 Seed 2.0 Lite（均衡）' },
  { id: 'doubao-seed-2-0-mini-260215', label: '豆包 Seed 2.0 Mini（快速低成本）' },
  { id: 'qwen-3-5-plus-260215', label: '通义千问 3.5 Plus（多模态）' },
];

export default function SettingsPage() {
  const {
    settings,
    updateSettings,
    briefs,
    customWords,
    hiddenBuiltin,
    resetLibrary,
  } = useAppState();
  const [showSecret, setShowSecret] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleClearData = () => {
    localStorage.removeItem(STORAGE_KEYS.briefs);
    window.location.reload();
  };

  return (
    <AppShell>
      <PageHeader
        title="设置"
        description="所有配置仅保存在当前浏览器本地（localStorage），不会上传到服务器"
      />

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto bg-page-bg">
        <div className="mx-auto max-w-2xl space-y-5 px-6 py-6">
          {/* 飞书 */}
          <Section
            icon={<KeyRound size={16} />}
            title="飞书应用凭证"
            desc="读取飞书云文档时通过服务端代理换取 tenant_access_token，App Secret 不会写入服务端存储"
          >
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>App ID</Label>
                <Input
                  value={settings.feishuAppId}
                  onChange={(e) =>
                    updateSettings({ feishuAppId: e.target.value.trim() })
                  }
                  placeholder="cli_xxxxxxxxxxxxxxxx"
                  className="font-mono text-[13px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label>App Secret</Label>
                <div className="relative">
                  <Input
                    type={showSecret ? 'text' : 'password'}
                    value={settings.feishuAppSecret}
                    onChange={(e) =>
                      updateSettings({ feishuAppSecret: e.target.value.trim() })
                    }
                    placeholder="飞书自建应用的 App Secret"
                    className="pr-9 font-mono text-[13px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                <p className="font-medium text-slate-700">配置步骤</p>
                <ol className="mt-1.5 list-decimal space-y-1 pl-4">
                  <li>
                    在
                    <a
                      href="https://open.feishu.cn/app"
                      target="_blank"
                      rel="noreferrer"
                      className="mx-1 inline-flex items-center gap-0.5 text-primary hover:underline"
                    >
                      飞书开放平台
                      <ExternalLink size={11} />
                    </a>
                    创建企业自建应用并发布版本
                  </li>
                  <li>
                    开通权限：查看新版文档（docx:document:readonly）、查看知识库（wiki:wiki:readonly）、
                    查看电子表格（sheets:spreadsheet:readonly）
                  </li>
                  <li>将目标文档添加为应用可访问文档，或开启「所有文档可见」</li>
                  <li>复制 App ID 与 App Secret 填入上方即可</li>
                </ol>
              </div>
            </div>
          </Section>

          {/* AI */}
          <Section
            icon={<Sparkles size={16} />}
            title="AI 模型"
            desc="用于 Brief 生成、违禁词智能改写与图片 OCR"
          >
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>生成模型</Label>
                <Select
                  value={settings.aiModel}
                  onValueChange={(v) => updateSettings({ aiModel: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>生成温度（{settings.aiTemperature.toFixed(1)}）</Label>
                  <span className="text-[11px] text-muted-foreground">
                    越低越严谨，建议 Brief 场景保持 0.3~0.5
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={settings.aiTemperature}
                  onChange={(e) =>
                    updateSettings({ aiTemperature: Number(e.target.value) })
                  }
                  className="w-full accent-[#1F4E79]"
                />
              </div>
            </div>
          </Section>

          {/* 词库 */}
          <Section
            icon={<BookOpen size={16} />}
            title="词库与扫描"
            desc="管理自定义词条的参与方式"
          >
            <label className="flex cursor-pointer items-center justify-between rounded-lg border border-line p-3">
              <div>
                <p className="text-[13px] font-medium">扫描时包含自定义词条</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  关闭后仅使用 564 条内置词库进行检测
                </p>
              </div>
              <Switch
                checked={settings.includeCustomWords}
                onCheckedChange={(v) =>
                  updateSettings({ includeCustomWords: v })
                }
              />
            </label>
          </Section>

          {/* 数据管理 */}
          <Section
            icon={<Database size={16} />}
            title="本地数据"
            desc="Brief、自定义词条与设置均存储于浏览器 localStorage"
          >
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <DataStat label="Brief 数量" value={briefs.length} />
                <DataStat label="自定义词条" value={customWords.length} />
                <DataStat label="已停用内置词" value={hiddenBuiltin.length} />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetLibrary();
                    flashSaved();
                    toast.success('词库已恢复默认（自定义词条已清空、内置词全部启用）');
                  }}
                >
                  {saved ? <Check size={14} /> : <BookOpen size={14} />}
                  恢复默认词库
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => setClearOpen(true)}
                >
                  <Trash2 size={14} />
                  清空全部本地数据
                </Button>
              </div>
            </div>
          </Section>

          <p className="pb-4 text-center text-[11px] text-muted-foreground">
            Brief 智能工作台 · 合规检测依据《中华人民共和国广告法》等公开法规整理，结果仅供内部参考
          </p>
        </div>
      </div>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>清空全部本地数据</AlertDialogTitle>
            <AlertDialogDescription>
              将删除全部 Brief、自定义词条与设置，词库恢复为内置默认状态。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleClearData}
            >
              全部清空
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function Section({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-white p-5">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/8 text-primary">
            {icon}
          </span>
          {title}
        </h2>
        <p className="mt-1.5 pl-9 text-xs leading-relaxed text-muted-foreground">
          {desc}
        </p>
      </div>
      <div className="pl-0">{children}</div>
    </section>
  );
}

function DataStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 py-3">
      <div className="text-xl font-semibold leading-none text-primary">
        {value}
      </div>
      <div className="mt-1.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
