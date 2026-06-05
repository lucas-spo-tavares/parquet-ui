import { MAX_PIE_CATEGORIES } from "../../app/constants";
import type { AggregatedChartRow, ChartConfig, DataRow } from "../../types";
import { asNumber, displayValue } from "../formatters/formatters";

function sortCategories(rows: AggregatedChartRow[]) {
  return rows.sort((a, b) => {
    const aNumber = Number(a.category);
    const bNumber = Number(b.category);
    if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) return aNumber - bNumber;
    const aDate = Date.parse(a.category);
    const bDate = Date.parse(b.category);
    if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) return aDate - bDate;
    return a.category.localeCompare(b.category);
  });
}

export function aggregateChartData(rows: DataRow[], config: ChartConfig): AggregatedChartRow[] {
  const groups = new Map<string, number[]>();

  for (const row of rows) {
    const category = displayValue(row[config.categoryColumn]) || "(empty)";
    const metric = config.aggregation === "count" ? 1 : asNumber(row[config.metricColumn]);
    if (metric === null) continue;
    groups.set(category, [...(groups.get(category) ?? []), metric]);
  }

  let aggregated = [...groups.entries()].map(([category, values]) => {
    const value =
      config.aggregation === "count"
        ? values.length
        : config.aggregation === "sum"
          ? values.reduce((sum, item) => sum + item, 0)
          : config.aggregation === "avg"
            ? values.reduce((sum, item) => sum + item, 0) / values.length
            : config.aggregation === "min"
              ? Math.min(...values)
              : Math.max(...values);

    return { category, value };
  });

  aggregated = config.type === "line" ? sortCategories(aggregated) : aggregated.sort((a, b) => b.value - a.value);

  if (config.type === "pie" && aggregated.length > MAX_PIE_CATEGORIES) {
    const visible = aggregated.slice(0, MAX_PIE_CATEGORIES);
    const other = aggregated.slice(MAX_PIE_CATEGORIES).reduce((sum, row) => sum + row.value, 0);
    return [...visible, { category: "Other", value: other }];
  }

  return aggregated.slice(0, 50);
}
