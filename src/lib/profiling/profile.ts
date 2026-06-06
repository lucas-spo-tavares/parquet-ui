import { asNumber, displayValue } from "@/lib/formatters/formatters";
import type { ColumnProfile, ColumnType, DataRow, ProfileResult, TableSchema } from "@/types";

function median(values: number[]) {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[middle - 1] + sorted[middle]) / 2;
  return sorted[middle];
}

function profileColumn(rows: DataRow[], columnName: string, type: ColumnType): ColumnProfile {
  const values = rows.map((row) => row[columnName]);
  const presentValues = values.filter((value) => value !== null && value !== undefined);
  const nullCount = values.length - presentValues.length;
  const valueCounts = new Map<string, number>();

  for (const value of presentValues) {
    const key = displayValue(value);
    valueCounts.set(key, (valueCounts.get(key) ?? 0) + 1);
  }

  const topValues = [...valueCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([value, count]) => ({ value, count }));

  const numericValues = presentValues.map(asNumber).filter((value): value is number => value !== null);
  const stringValues = presentValues.map(displayValue);
  const booleanValues = presentValues.filter((value): value is boolean => typeof value === "boolean");

  return {
    columnName,
    type,
    nullCount,
    nullPercent: values.length > 0 ? (nullCount / values.length) * 100 : 0,
    distinctCount: valueCounts.size,
    min: numericValues.length ? Math.min(...numericValues) : stringValues.sort()[0],
    max: numericValues.length ? Math.max(...numericValues) : stringValues.sort().at(-1),
    mean: numericValues.length ? numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length : undefined,
    median: median(numericValues),
    trueCount: booleanValues.filter(Boolean).length,
    falseCount: booleanValues.filter((value) => !value).length,
    averageLength:
      type === "string" && stringValues.length
        ? stringValues.reduce((sum, value) => sum + value.length, 0) / stringValues.length
        : undefined,
    topValues,
  };
}

export function buildProfile(rows: DataRow[], schema: TableSchema): ProfileResult {
  return {
    rowCount: schema.rowCount,
    sampleSize: rows.length,
    isSampled: rows.length < schema.rowCount,
    columns: schema.columns.map((column) => profileColumn(rows, column.name, column.uiType)),
  };
}

export function profileRowsToCsvRows(profile: ProfileResult): DataRow[] {
  return profile.columns.map((column) => ({
    column: column.columnName,
    type: column.type,
    null_count: column.nullCount,
    null_percent: column.nullPercent,
    distinct_count: column.distinctCount,
    min: column.min,
    max: column.max,
    mean: column.mean,
    median: column.median,
    true_count: column.trueCount,
    false_count: column.falseCount,
    average_length: column.averageLength,
    top_values: column.topValues.map((value) => `${value.value}:${value.count}`).join(" | "),
  }));
}
