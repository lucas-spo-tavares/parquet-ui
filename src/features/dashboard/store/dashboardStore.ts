import { create } from "zustand";
import type { ChartConfig } from "@/types";

type DashboardStore = {
  charts: ChartConfig[];
  countChartsBySource: (sourceKind: ChartConfig["sourceKind"], sourceId: string) => number;
  removeChartsBySource: (sourceKind: ChartConfig["sourceKind"], sourceId: string) => void;
  upsertChart: (chart: ChartConfig) => void;
  removeChart: (chartId: string) => void;
};

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  charts: [],
  countChartsBySource: (sourceKind, sourceId) => get().charts.filter((chart) => chart.sourceKind === sourceKind && chart.sourceId === sourceId).length,
  removeChartsBySource: (sourceKind, sourceId) =>
    set((state) => ({
      charts: state.charts.filter((chart) => !(chart.sourceKind === sourceKind && chart.sourceId === sourceId)),
    })),
  upsertChart: (chart) =>
    set((state) => {
      const exists = state.charts.some((item) => item.id === chart.id);

      return {
        charts: exists ? state.charts.map((item) => (item.id === chart.id ? chart : item)) : [...state.charts, chart],
      };
    }),
  removeChart: (chartId) =>
    set((state) => ({
      charts: state.charts.filter((chart) => chart.id !== chartId),
    })),
}));
