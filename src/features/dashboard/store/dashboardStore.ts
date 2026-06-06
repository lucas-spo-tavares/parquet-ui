import { create } from "zustand";
import type { ChartConfig } from "@/types";

type DashboardStore = {
  chartsByFileId: Record<string, ChartConfig[]>;
  upsertChart: (fileId: string, chart: ChartConfig) => void;
  removeChart: (fileId: string, chartId: string) => void;
};

export const useDashboardStore = create<DashboardStore>((set) => ({
  chartsByFileId: {},
  upsertChart: (fileId, chart) =>
    set((state) => {
      const charts = state.chartsByFileId[fileId] ?? [];
      const exists = charts.some((item) => item.id === chart.id);

      return {
        chartsByFileId: {
          ...state.chartsByFileId,
          [fileId]: exists ? charts.map((item) => (item.id === chart.id ? chart : item)) : [...charts, chart],
        },
      };
    }),
  removeChart: (fileId, chartId) =>
    set((state) => ({
      chartsByFileId: {
        ...state.chartsByFileId,
        [fileId]: (state.chartsByFileId[fileId] ?? []).filter((chart) => chart.id !== chartId),
      },
    })),
}));
