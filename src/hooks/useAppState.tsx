'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AppSettings, Brief, ForbiddenWord } from '@/lib/types';
import {
  BUILTIN_WORDS,
  DEFAULT_SETTINGS,
  loadBriefs,
  loadCustomWords,
  loadHiddenBuiltin,
  loadSettings,
  saveBriefs,
  saveCustomWords,
  saveHiddenBuiltin,
  saveSettings,
  uid,
} from '@/lib/storage';
import { createBrief } from '@/lib/defaults';

interface AppState {
  ready: boolean;
  briefs: Brief[];
  /** 当前生效词库 = 未停用的内置词 + 自定义词 */
  activeLibrary: ForbiddenWord[];
  customWords: ForbiddenWord[];
  hiddenBuiltin: string[];
  settings: AppSettings;
  // brief
  createNewBrief: (partial?: Partial<Brief>) => Brief;
  updateBrief: (id: string, patch: Partial<Brief>) => void;
  deleteBrief: (id: string) => void;
  duplicateBrief: (id: string) => Brief | undefined;
  getBrief: (id: string) => Brief | undefined;
  // words
  addCustomWord: (
    word: Omit<ForbiddenWord, 'id' | 'builtin'>,
  ) => ForbiddenWord;
  updateCustomWord: (id: string, patch: Partial<ForbiddenWord>) => void;
  deleteCustomWord: (id: string) => void;
  toggleBuiltinWord: (id: string, hidden: boolean) => void;
  resetLibrary: () => void;
  importWords: (words: Array<Omit<ForbiddenWord, 'id' | 'builtin'>>) => number;
  // settings
  updateSettings: (patch: Partial<AppSettings>) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [customWords, setCustomWords] = useState<ForbiddenWord[]>([]);
  const [hiddenBuiltin, setHiddenBuiltin] = useState<string[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setBriefs(loadBriefs());
    setCustomWords(loadCustomWords());
    setHiddenBuiltin(loadHiddenBuiltin());
    setSettings(loadSettings());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveBriefs(briefs);
  }, [briefs, ready]);
  useEffect(() => {
    if (ready) saveCustomWords(customWords);
  }, [customWords, ready]);
  useEffect(() => {
    if (ready) saveHiddenBuiltin(hiddenBuiltin);
  }, [hiddenBuiltin, ready]);
  useEffect(() => {
    if (ready) saveSettings(settings);
  }, [settings, ready]);

  const activeLibrary = useMemo(() => {
    const enabledBuiltins = BUILTIN_WORDS.filter(
      (w) => !hiddenBuiltin.includes(w.id),
    );
    return settings.includeCustomWords
      ? [...enabledBuiltins, ...customWords]
      : enabledBuiltins;
  }, [hiddenBuiltin, customWords, settings.includeCustomWords]);

  const createNewBrief = useCallback((partial?: Partial<Brief>) => {
    const brief = createBrief(partial);
    setBriefs((prev) => [brief, ...prev]);
    return brief;
  }, []);

  const updateBrief = useCallback((id: string, patch: Partial<Brief>) => {
    setBriefs((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, ...patch, updatedAt: Date.now() } : b,
      ),
    );
  }, []);

  const deleteBrief = useCallback((id: string) => {
    setBriefs((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const duplicateBrief = useCallback(
    (id: string) => {
      const source = briefs.find((b) => b.id === id);
      if (!source) return undefined;
      const copy: Brief = {
        ...structuredClone(source),
        id: uid('brief'),
        title: `${source.title}（副本）`,
        modules: source.modules.map((m) => ({ ...m, id: uid('mod') })),
        riskLevel: 'none',
        issueCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setBriefs((prev) => [copy, ...prev]);
      return copy;
    },
    [briefs],
  );

  const getBrief = useCallback(
    (id: string) => briefs.find((b) => b.id === id),
    [briefs],
  );

  const addCustomWord = useCallback(
    (word: Omit<ForbiddenWord, 'id' | 'builtin'>) => {
      const entry: ForbiddenWord = {
        ...word,
        id: uid('custom'),
        builtin: false,
      };
      setCustomWords((prev) => [entry, ...prev]);
      return entry;
    },
    [],
  );

  const updateCustomWord = useCallback(
    (id: string, patch: Partial<ForbiddenWord>) => {
      setCustomWords((prev) =>
        prev.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      );
    },
    [],
  );

  const deleteCustomWord = useCallback((id: string) => {
    setCustomWords((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const toggleBuiltinWord = useCallback((id: string, hidden: boolean) => {
    setHiddenBuiltin((prev) =>
      hidden ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id),
    );
  }, []);

  const resetLibrary = useCallback(() => {
    setCustomWords([]);
    setHiddenBuiltin([]);
  }, []);

  const importWords = useCallback(
    (words: Array<Omit<ForbiddenWord, 'id' | 'builtin'>>) => {
      const entries: ForbiddenWord[] = words.map((w) => ({
        ...w,
        id: uid('custom'),
        builtin: false,
      }));
      setCustomWords((prev) => [...entries, ...prev]);
      return entries.length;
    },
    [],
  );

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const value: AppState = {
    ready,
    briefs,
    activeLibrary,
    customWords,
    hiddenBuiltin,
    settings,
    createNewBrief,
    updateBrief,
    deleteBrief,
    duplicateBrief,
    getBrief,
    addCustomWord,
    updateCustomWord,
    deleteCustomWord,
    toggleBuiltinWord,
    resetLibrary,
    importWords,
    updateSettings,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppState 必须在 AppStateProvider 内使用');
  return ctx;
}
