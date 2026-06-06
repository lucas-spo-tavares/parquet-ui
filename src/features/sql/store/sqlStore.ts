import { create } from "zustand";
import type { QueryError, QueryResult } from "@/types";

export type SqlSource = {
  id: string;
  name: string;
  sql: string;
};

export type SqlTab = {
  id: string;
  name: string;
  sourceId: string;
  sql: string;
  queryOpen: boolean;
  resultLimit: number;
  result?: QueryResult;
  queryError?: QueryError;
};

type SqlStore = {
  activeTabId: string;
  nextTabNumber: number;
  savedSources: SqlSource[];
  tabs: SqlTab[];
  addTab: (defaultSql: string) => void;
  closeTab: (tabId: string) => string | undefined;
  countSourcesReferencingAlias: (alias: string) => number;
  removeSourcesByParquetAlias: (alias: string, defaultSql: string) => string[];
  renameTab: (tabId: string, name: string) => void;
  setActiveTab: (tabId: string) => void;
  setQueryError: (tabId: string, error: QueryError | undefined) => void;
  setQueryOpen: (tabId: string, open: boolean) => void;
  setQueryResult: (tabId: string, result: QueryResult | undefined) => void;
  setResultLimit: (tabId: string, resultLimit: number) => void;
  setSql: (tabId: string, sql: string) => void;
};

function sqlReferencesAlias(sql: string, alias: string) {
  const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const aliasRegex = new RegExp(`\\b${escapedAlias}\\b`, "i");
  return aliasRegex.test(sql);
}

function createSource(tabNumber: number, defaultSql: string): SqlSource {
  return {
    id: crypto.randomUUID(),
    name: `Query ${tabNumber}`,
    sql: defaultSql,
  };
}

function createTab(source: SqlSource): SqlTab {
  return {
    id: crypto.randomUUID(),
    name: source.name,
    sourceId: source.id,
    sql: source.sql,
    queryOpen: true,
    resultLimit: 1_000,
  };
}

const initialSource = createSource(1, "SELECT *\nFROM data1\nLIMIT 100;");
const initialTab = createTab(initialSource);

export const useSqlStore = create<SqlStore>((set, get) => ({
  activeTabId: initialTab.id,
  nextTabNumber: 2,
  savedSources: [initialSource],
  tabs: [initialTab],
  addTab: (defaultSql) =>
    set((state) => {
      const nextSource = createSource(state.nextTabNumber, defaultSql);
      const nextTab = createTab(nextSource);

      return {
        activeTabId: nextTab.id,
        nextTabNumber: state.nextTabNumber + 1,
        savedSources: [...state.savedSources, nextSource],
        tabs: [...state.tabs, nextTab],
      };
    }),
  closeTab: (tabId): string | undefined => {
    const targetTab = get().tabs.find((tab) => tab.id === tabId);
    if (!targetTab) return undefined;

    set((state) => {
      const nextTabs = state.tabs.filter((tab) => tab.id !== tabId);
      const nextSavedSources = state.savedSources.filter((source) => source.id !== targetTab.sourceId);

      if (!nextTabs.length) {
        const fallbackSource = createSource(state.nextTabNumber, initialSource.sql);
        const fallbackTab = createTab(fallbackSource);
        return {
          activeTabId: fallbackTab.id,
          nextTabNumber: state.nextTabNumber + 1,
          savedSources: [...nextSavedSources, fallbackSource],
          tabs: [fallbackTab],
        };
      }

      const nextActiveTabId =
        state.activeTabId === tabId
          ? nextTabs[Math.max(0, state.tabs.findIndex((tab) => tab.id === tabId) - 1)]?.id ?? nextTabs[0].id
          : state.activeTabId;

      return {
        activeTabId: nextActiveTabId,
        savedSources: nextSavedSources,
        tabs: nextTabs,
      };
    });

    return targetTab.sourceId;
  },
  countSourcesReferencingAlias: (alias) => get().savedSources.filter((source) => sqlReferencesAlias(source.sql, alias)).length,
  removeSourcesByParquetAlias: (alias, defaultSql) => {
    const state = get();
    const removedSourceIds = state.savedSources.filter((source) => sqlReferencesAlias(source.sql, alias)).map((source) => source.id);
    if (!removedSourceIds.length) return [];

    set((current) => {
      const nextTabs = current.tabs.filter((tab) => !removedSourceIds.includes(tab.sourceId));
      const nextSavedSources = current.savedSources.filter((source) => !removedSourceIds.includes(source.id));

      if (!nextTabs.length) {
        const fallbackSource = createSource(current.nextTabNumber, defaultSql);
        const fallbackTab = createTab(fallbackSource);
        return {
          activeTabId: fallbackTab.id,
          nextTabNumber: current.nextTabNumber + 1,
          savedSources: [...nextSavedSources, fallbackSource],
          tabs: [fallbackTab],
        };
      }

      const activeTabStillExists = nextTabs.some((tab) => tab.id === current.activeTabId);
      return {
        activeTabId: activeTabStillExists ? current.activeTabId : nextTabs[0].id,
        savedSources: nextSavedSources,
        tabs: nextTabs,
      };
    });

    return removedSourceIds;
  },
  renameTab: (tabId, name) =>
    set((state) => {
      const nextName = name.trim();
      const targetTab = state.tabs.find((tab) => tab.id === tabId);
      if (!targetTab || !nextName) return state;

      return {
        savedSources: state.savedSources.map((source) => (source.id === targetTab.sourceId ? { ...source, name: nextName } : source)),
        tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, name: nextName } : tab)),
      };
    }),
  setActiveTab: (tabId) => set({ activeTabId: tabId }),
  setQueryError: (tabId, error) =>
    set((state) => {
      return {
        tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, queryError: error } : tab)),
      };
    }),
  setQueryOpen: (tabId, open) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, queryOpen: open } : tab)),
    })),
  setQueryResult: (tabId, result) =>
    set((state) => {
      return {
        tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, result } : tab)),
      };
    }),
  setResultLimit: (tabId, resultLimit) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, resultLimit } : tab)),
    })),
  setSql: (tabId, sql) =>
    set((state) => {
      const targetTab = state.tabs.find((tab) => tab.id === tabId);
      if (!targetTab) return state;

      return {
        savedSources: state.savedSources.map((source) => (source.id === targetTab.sourceId ? { ...source, sql } : source)),
        tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, sql } : tab)),
      };
    }),
}));
