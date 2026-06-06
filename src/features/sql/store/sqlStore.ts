import { create } from "zustand";
import type { QueryError, QueryResult } from "@/types";

export type SqlTab = {
  id: string;
  name: string;
  sql: string;
  queryOpen: boolean;
  result?: QueryResult;
  queryError?: QueryError;
};

type SqlStore = {
  activeTabId: string;
  nextTabNumber: number;
  tabs: SqlTab[];
  addTab: (defaultSql: string) => void;
  closeTab: (tabId: string, defaultSql: string) => void;
  renameTab: (tabId: string, name: string) => void;
  setActiveTab: (tabId: string) => void;
  setQueryError: (tabId: string, error: QueryError | undefined) => void;
  setQueryOpen: (tabId: string, open: boolean) => void;
  setQueryResult: (tabId: string, result: QueryResult | undefined) => void;
  setSql: (tabId: string, sql: string) => void;
};

function createTab(tabNumber: number, defaultSql: string): SqlTab {
  return {
    id: crypto.randomUUID(),
    name: `Query ${tabNumber}`,
    sql: defaultSql,
    queryOpen: true,
  };
}

const initialTab = createTab(1, "SELECT *\nFROM data1\nLIMIT 100;");

export const useSqlStore = create<SqlStore>((set) => ({
  activeTabId: initialTab.id,
  nextTabNumber: 2,
  tabs: [initialTab],
  addTab: (defaultSql) =>
    set((state) => {
      const nextTab = createTab(state.nextTabNumber, defaultSql);

      return {
        activeTabId: nextTab.id,
        nextTabNumber: state.nextTabNumber + 1,
        tabs: [...state.tabs, nextTab],
      };
    }),
  closeTab: (tabId, defaultSql) =>
    set((state) => {
      const nextTabs = state.tabs.filter((tab) => tab.id !== tabId);

      if (!nextTabs.length) {
        const fallbackTab = createTab(state.nextTabNumber, defaultSql);
        return {
          activeTabId: fallbackTab.id,
          nextTabNumber: state.nextTabNumber + 1,
          tabs: [fallbackTab],
        };
      }

      const nextActiveTabId =
        state.activeTabId === tabId
          ? nextTabs[Math.max(0, state.tabs.findIndex((tab) => tab.id === tabId) - 1)]?.id ?? nextTabs[0].id
          : state.activeTabId;

      return {
        activeTabId: nextActiveTabId,
        tabs: nextTabs,
      };
    }),
  renameTab: (tabId, name) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, name: name.trim() || tab.name } : tab)),
    })),
  setActiveTab: (tabId) => set({ activeTabId: tabId }),
  setQueryError: (tabId, error) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, queryError: error } : tab)),
    })),
  setQueryOpen: (tabId, open) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, queryOpen: open } : tab)),
    })),
  setQueryResult: (tabId, result) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, result } : tab)),
    })),
  setSql: (tabId, sql) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, sql } : tab)),
    })),
}));
